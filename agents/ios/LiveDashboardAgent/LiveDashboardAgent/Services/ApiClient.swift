import Foundation
import UIKit

class ApiClient {
    static let shared = ApiClient()

    private let session = URLSession.shared
    private var retryDelay: Double = 1.0
    private let maxRetryDelay: Double = 60.0
    private let maxCacheSize = 50
    private var failureCache: [[String: Any]] = []

    private init() {}

    func reportApps(_ payloads: [ReportPayload], completion: @escaping (Result<Void, Error>) -> Void) {
        let config = ConfigManager.shared.getConfig()
        guard !config.serverUrl.isEmpty else {
            completion(.failure(ApiError.notConfigured))
            return
        }

        guard let url = URL(string: config.serverUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/api/report") else {
            completion(.failure(ApiError.invalidUrl))
            return
        }

        var body = buildMultiAppBody(payloads: payloads, deviceToken: config.deviceToken)

        var allPayloads: [[String: Any]] = failureCache
        failureCache.removeAll()
        allPayloads.append(body)

        for payload in allPayloads {
            sendRequest(url: url, token: config.deviceToken, body: payload) { [weak self] result in
                switch result {
                case .success:
                    break
                case .failure:
                    self?.cacheFailedPayload(payload)
                }
            }
        }

        sendRequest(url: url, token: config.deviceToken, body: body) { [weak self] result in
            switch result {
            case .success:
                self?.retryDelay = 1.0
                completion(.success(()))
            case .failure(let error):
                self?.cacheFailedPayload(body)
                self?.retryDelay = min(self!.retryDelay * 2, self!.maxRetryDelay)
                completion(.failure(error))
            }
        }
    }

    private func buildMultiAppBody(payloads: [ReportPayload], deviceToken: String) -> [String: Any] {
        let appIds = payloads.map { $0.appId }.joined(separator: ";;")
        let windowTitles = payloads.map { $0.windowTitle }.joined(separator: ";;")
        let isForegrounds = payloads.map { $0.isForeground ? "1" : "0" }.joined(separator: ";;")

        let now = Date()
        let cal = Calendar.current
        let year = cal.component(.year, from: now)
        let month = String(format: "%02d", cal.component(.month, from: now))
        let day = String(format: "%02d", cal.component(.day, from: now))
        let hour = String(format: "%02d", cal.component(.hour, from: now))
        let minute = String(format: "%02d", cal.component(.minute, from: now))
        let timestamp = "\(year);\(month);\(day);\(hour):\(minute)"

        let tzOffset = TimeZone.current.secondsFromGMT(for: now) / 60

        var extraDict: [String: Any] = [:]
        if let first = payloads.first {
            if let bp = first.extra.batteryPercent { extraDict["battery_percent"] = bp }
            if let bc = first.extra.batteryCharging { extraDict["battery_charging"] = bc }
            if let so = first.extra.screenOn { extraDict["screen_on"] = so }
        }

        return [
            "device_token": deviceToken,
            "app_id": appIds,
            "window_title": windowTitles,
            "is_foreground": isForegrounds,
            "timestamp": timestamp,
            "tz": tzOffset,
            "extra": extraDict
        ]
    }

    private func sendRequest(url: URL, token: String, body: [String: Any], completion: @escaping (Result<Void, Error>) -> Void) {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 15

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        let task = session.dataTask(with: request) { [weak self] _, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
                completion(.failure(ApiError.serverError(statusCode)))
                return
            }

            self?.retryFailedCache(url: url, token: token)
            completion(.success(()))
        }
        task.resume()
    }

    private func cacheFailedPayload(_ payload: [String: Any]) {
        if failureCache.count >= maxCacheSize {
            failureCache.removeFirst()
        }
        failureCache.append(payload)
    }

    private func retryFailedCache(url: URL, token: String) {
        let cached = failureCache
        failureCache.removeAll()

        for payload in cached {
            sendRequest(url: url, token: token, body: payload) { [weak self] result in
                if case .failure = result {
                    self?.cacheFailedPayload(payload)
                }
            }
        }
    }

    func testConnection(serverUrl: String, completion: @escaping (TestConnectionStep, Error?) -> Void) {
        guard let url = URL(string: serverUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))) else {
            completion(.dns, ApiError.invalidUrl)
            return
        }

        let host = url.host ?? ""

        DispatchQueue.global(qos: .userInitiated).async {
            completion(.dns, nil)

            let dnsStart = Date()
            let hostRef = CFHostCreateWithName(nil, host as CFString).takeRetainedValue()
            var resolved = false
            CFHostStartInfoResolution(hostRef, .addresses, nil)
            var error = CFStreamError()
            if CFHostGetAddressing(hostRef, &resolved, &error) && resolved {
                let dnsTime = Date().timeIntervalSince(dnsStart)
                if dnsTime > 10 {
                    completion(.dns, ApiError.timeout)
                    return
                }
            } else {
                completion(.dns, ApiError.dnsFailed)
                return
            }

            completion(.tcp, nil)

            let tcpStart = Date()
            let tcpResult = self.testTCPPort(host: host, port: url.port ?? 80)
            if !tcpResult {
                completion(.tcp, ApiError.tcpFailed)
                return
            }
            let tcpTime = Date().timeIntervalSince(tcpStart)
            if tcpTime > 10 {
                completion(.tcp, ApiError.timeout)
                return
            }

            completion(.http, nil)

            let healthUrl = url.appendingPathComponent("/api/health")
            var request = URLRequest(url: healthUrl)
            request.httpMethod = "GET"
            request.timeoutInterval = 10

            let semaphore = DispatchSemaphore(value: 0)
            var httpError: Error?

            self.session.dataTask(with: request) { _, response, error in
                if let error = error {
                    httpError = error
                } else if let httpResponse = response as? HTTPURLResponse,
                          !(200...299).contains(httpResponse.statusCode) {
                    httpError = ApiError.serverError(httpResponse.statusCode)
                }
                semaphore.signal()
            }.resume()

            semaphore.wait()

            if let error = httpError {
                completion(.http, error)
            } else {
                completion(.done, nil)
            }
        }
    }

    private func testTCPPort(host: String, port: Int) -> Bool {
        var hints = addrinfo()
        hints.ai_socktype = SOCK_STREAM
        hints.ai_family = AF_UNSPEC
        var res: UnsafeMutablePointer<addrinfo>?

        guard getaddrinfo(host, String(port), &hints, &res) == 0, let addrInfo = res else {
            return false
        }
        defer { freeaddrinfo(res) }

        let sock = socket(addrInfo.pointee.ai_family, addrInfo.pointee.ai_socktype, addrInfo.pointee.ai_protocol)
        guard sock >= 0 else { return false }
        defer { close(sock) }

        let connectResult = connect(sock, addrInfo.pointee.ai_addr, addrInfo.pointee.ai_addrlen)
        return connectResult == 0
    }

    func collectExtraInfo() -> ExtraInfo {
        var extra = ExtraInfo()

        UIDevice.current.isBatteryMonitoringEnabled = true
        let batteryLevel = UIDevice.current.batteryLevel
        if batteryLevel >= 0 {
            extra.batteryPercent = Int(batteryLevel * 100)
        }

        let batteryState = UIDevice.current.batteryState
        switch batteryState {
        case .charging, .full:
            extra.batteryCharging = true
        case .unplugged:
            extra.batteryCharging = false
        default:
            break
        }

        extra.screenOn = UIScreen.main.brightness > 0

        return extra
    }

    enum ApiError: LocalizedError {
        case notConfigured
        case invalidUrl
        case serverError(Int)
        case timeout
        case dnsFailed
        case tcpFailed

        var errorDescription: String? {
            switch self {
            case .notConfigured: return "未配置服务器地址"
            case .invalidUrl: return "无效的URL"
            case .serverError(let code): return "服务器错误: \(code)"
            case .timeout: return "连接超时"
            case .dnsFailed: return "DNS解析失败"
            case .tcpFailed: return "TCP连接失败"
            }
        }
    }

    enum TestConnectionStep {
        case dns
        case tcp
        case http
        case done
    }
}

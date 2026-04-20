-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn com.google.gson.**
-keep class com.livedashboard.agent.** { *; }
-keep class com.google.gson.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keepattributes *Annotation*, InnerClasses, Signature, EnclosingMethod, LineNumberTable
-keep class * extends android.app.Service
-keep class * extends android.accessibilityservice.AccessibilityService
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

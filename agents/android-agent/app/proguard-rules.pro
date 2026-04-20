-dontwarn **
-keep class com.livedashboard.agent.** { *; }
-keep class com.google.gson.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-keep class androidx.** { *; }
-keep class android.** { *; }
-keepattributes *Annotation*, InnerClasses, Signature, EnclosingMethod, LineNumberTable
-keep class * extends android.app.Service
-keep class * extends android.accessibilityservice.AccessibilityService
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

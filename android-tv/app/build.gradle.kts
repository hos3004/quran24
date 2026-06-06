plugins {
    id("com.android.application")
}

android {
    namespace = "com.quran24.tv"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.quran24.tv"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    val media3Version = "1.10.1"

    implementation("androidx.webkit:webkit:1.16.0")
    implementation("androidx.window.extensions.core:core:1.0.0")
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-exoplayer-hls:$media3Version")
    implementation("androidx.media3:media3-ui:$media3Version")
}

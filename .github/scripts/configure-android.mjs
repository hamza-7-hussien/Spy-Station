import fs from 'node:fs';
import path from 'node:path';

const versionInfo = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
const versionName = versionInfo.version || '2.8.0';
const buildNum = Number(process.env.BUILD_NUM || 1);

// 1. Update build.gradle versionCode, versionName, and native Google Sign-In dependency
const gradlePath = 'android/app/build.gradle';
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${buildNum}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
if (!gradle.includes('com.google.android.gms:play-services-auth')) {
  gradle = gradle.replace(
    'dependencies {',
    'dependencies {\n    implementation "com.google.android.gms:play-services-auth:21.2.0"'
  );
}
fs.writeFileSync(gradlePath, gradle);

// 2. Add WebRTC voice, network & wake-lock permissions and disable HyperOS/MIUI auto force-dark in AndroidManifest.xml
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.WAKE_LOCK'
];
for (const p of perms) {
  if (!manifest.includes(p)) {
    manifest = manifest.replace(
      '<application',
      `    <uses-permission android:name="${p}" />\n    <application`
    );
  }
}
if (!manifest.includes('android:forceDarkAllowed')) {
  manifest = manifest.replace('<application', '<application\n        android:forceDarkAllowed="false"');
}
fs.writeFileSync(manifestPath, manifest);

// 3. Configure styles.xml for edge-to-edge dark cosmic fullscreen without cutout bars
const stylesPath = 'android/app/src/main/res/values/styles.xml';
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  if (!styles.includes('windowLayoutInDisplayCutoutMode')) {
    styles = styles.replace(
      '</style>',
      [
        '        <item name="android:windowFullscreen">true</item>',
        '        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>',
        '        <item name="android:statusBarColor">#030712</item>',
        '        <item name="android:navigationBarColor">#030712</item>',
        '        <item name="android:windowBackground">#030712</item>',
        '    </style>'
      ].join('\n')
    );
    fs.writeFileSync(stylesPath, styles);
  }
}

// 4. Write enhanced MainActivity.java with Native Android Google Account Picker, Immersive Sticky Fullscreen, sleek dark OAuth popup Dialog, and 3P cookies
const mainActivityPath = 'android/app/src/main/java/com/spystation/game/MainActivity.java';
const mainActivityJava = `package com.spystation.game;

import android.app.Dialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.tasks.Task;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int RC_GOOGLE_SIGN_IN = 9001;
    private GoogleSignInClient googleSignInClient;

    private void emitNativeGoogleResult(JSONObject payload) {
        final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        final String js = "window.dispatchEvent(new CustomEvent('spy-native-google-result', { detail: " + payload.toString() + " }));";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    public class SpyStationNativeAuth {
        @JavascriptInterface
        public boolean isSupported() {
            return true;
        }

        @JavascriptInterface
        public void signInWithGoogle(final String webClientId) {
            runOnUiThread(() -> {
                try {
                    if (webClientId == null || webClientId.trim().isEmpty()) {
                        JSONObject err = new JSONObject();
                        err.put("status", "error");
                        err.put("code", -1);
                        err.put("message", "Missing Web OAuth Client ID");
                        emitNativeGoogleResult(err);
                        return;
                    }

                    GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(webClientId.trim())
                        .requestEmail()
                        .requestProfile()
                        .build();

                    googleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                    // Sign out cached Play Services choice so the native Android account picker always lists device accounts
                    googleSignInClient.signOut().addOnCompleteListener(MainActivity.this, task -> {
                        try {
                            Intent signInIntent = googleSignInClient.getSignInIntent();
                            startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                        } catch (Exception launchEx) {
                            try {
                                JSONObject err = new JSONObject();
                                err.put("status", "error");
                                err.put("code", -2);
                                err.put("message", String.valueOf(launchEx.getMessage()));
                                emitNativeGoogleResult(err);
                            } catch (Exception ignored) {}
                        }
                    });
                } catch (Exception ex) {
                    try {
                        JSONObject err = new JSONObject();
                        err.put("status", "error");
                        err.put("code", -3);
                        err.put("message", String.valueOf(ex.getMessage()));
                        emitNativeGoogleResult(err);
                    } catch (Exception ignored) {}
                }
            });
        }
    }

    private String buildCleanChromeUserAgent(String rawUa) {
        if (rawUa == null || rawUa.isEmpty()) return rawUa;
        return rawUa
            .replace("; wv)", ")")
            .replace("; wv;", ";")
            .replace("Version/4.0 ", "");
    }

    private void applyImmersiveFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == RC_GOOGLE_SIGN_IN) {
            try {
                Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                GoogleSignInAccount account = task.getResult(ApiException.class);
                String idToken = account != null ? account.getIdToken() : null;
                if (idToken != null && !idToken.isEmpty()) {
                    JSONObject ok = new JSONObject();
                    ok.put("status", "success");
                    ok.put("idToken", idToken);
                    ok.put("email", account.getEmail() != null ? account.getEmail() : "");
                    emitNativeGoogleResult(ok);
                } else {
                    JSONObject err = new JSONObject();
                    err.put("status", "error");
                    err.put("code", -4);
                    err.put("message", "No Google ID token returned");
                    emitNativeGoogleResult(err);
                }
            } catch (ApiException apiEx) {
                int code = apiEx.getStatusCode();
                try {
                    if (code == CommonStatusCodes.CANCELED
                        || code == GoogleSignInStatusCodes.SIGN_IN_CANCELLED
                        || code == 12501) {
                        JSONObject canceled = new JSONObject();
                        canceled.put("status", "cancel");
                        emitNativeGoogleResult(canceled);
                    } else {
                        JSONObject err = new JSONObject();
                        err.put("status", "error");
                        err.put("code", code);
                        err.put("message", String.valueOf(apiEx.getMessage()));
                        emitNativeGoogleResult(err);
                    }
                } catch (Exception ignored) {}
            } catch (Exception ex) {
                try {
                    JSONObject err = new JSONObject();
                    err.put("status", "error");
                    err.put("code", -5);
                    err.put("message", String.valueOf(ex.getMessage()));
                    emitNativeGoogleResult(err);
                } catch (Exception ignored) {}
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyImmersiveFullscreen();

        final WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.addJavascriptInterface(new SpyStationNativeAuth(), "SpyStationNativeAuth");
        webView.setBackgroundColor(Color.parseColor("#030712"));
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        final String cleanUa = buildCleanChromeUserAgent(settings.getUserAgentString());
        if (cleanUa != null) {
            settings.setUserAgentString(cleanUa);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        final WebChromeClient origChrome = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            ? webView.getWebChromeClient()
            : null;

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (origChrome != null) {
                    origChrome.onPermissionRequest(request);
                } else {
                    runOnUiThread(() -> request.grant(request.getResources()));
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (origChrome != null) {
                    return origChrome.onShowFileChooser(view, filePathCallback, fileChooserParams);
                }
                return super.onShowFileChooser(view, filePathCallback, fileChooserParams);
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                if (origChrome != null) return origChrome.onJsAlert(view, url, message, result);
                return super.onJsAlert(view, url, message, result);
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (origChrome != null) return origChrome.onJsConfirm(view, url, message, result);
                return super.onJsConfirm(view, url, message, result);
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                if (origChrome != null) return origChrome.onJsPrompt(view, url, message, defaultValue, result);
                return super.onJsPrompt(view, url, message, defaultValue, result);
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (origChrome != null) {
                    origChrome.onGeolocationPermissionsShowPrompt(origin, callback);
                } else {
                    super.onGeolocationPermissionsShowPrompt(origin, callback);
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                final Dialog popupDialog = new Dialog(MainActivity.this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
                Window dialogWindow = popupDialog.getWindow();
                if (dialogWindow != null) {
                    dialogWindow.setBackgroundDrawable(new ColorDrawable(Color.parseColor("#030712")));
                }

                final LinearLayout container = new LinearLayout(MainActivity.this);
                container.setOrientation(LinearLayout.VERTICAL);
                container.setBackgroundColor(Color.parseColor("#030712"));
                container.setLayoutParams(new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ));

                final LinearLayout header = new LinearLayout(MainActivity.this);
                header.setOrientation(LinearLayout.HORIZONTAL);
                header.setGravity(Gravity.CENTER_VERTICAL);
                header.setBackgroundColor(Color.parseColor("#0f172a"));
                final float density = getResources().getDisplayMetrics().density;
                final int padH = Math.round(16 * density);
                final int padV = Math.round(12 * density);
                header.setPadding(padH, padV, padH, padV);

                final TextView titleView = new TextView(MainActivity.this);
                titleView.setText("Spy Station · Google");
                titleView.setTextColor(Color.parseColor("#f8fafc"));
                titleView.setTextSize(15f);
                titleView.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
                header.addView(titleView);

                final TextView closeBtn = new TextView(MainActivity.this);
                closeBtn.setText("✕");
                closeBtn.setTextColor(Color.parseColor("#94a3b8"));
                closeBtn.setTextSize(18f);
                closeBtn.setPadding(Math.round(12 * density), Math.round(4 * density), Math.round(4 * density), Math.round(4 * density));
                closeBtn.setOnClickListener(v -> popupDialog.dismiss());
                header.addView(closeBtn);
                container.addView(header);

                final ProgressBar progressBar = new ProgressBar(MainActivity.this, null, android.R.attr.progressBarStyleHorizontal);
                progressBar.setMax(100);
                progressBar.setProgress(15);
                progressBar.setLayoutParams(new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    Math.max(4, Math.round(3 * density))
                ));
                container.addView(progressBar);

                final WebView popupWebView = new WebView(MainActivity.this);
                popupWebView.setBackgroundColor(Color.parseColor("#030712"));
                popupWebView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                popupWebView.setLayoutParams(new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    0,
                    1f
                ));

                WebSettings pSettings = popupWebView.getSettings();
                pSettings.setJavaScriptEnabled(true);
                pSettings.setDomStorageEnabled(true);
                pSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                pSettings.setSupportMultipleWindows(true);
                if (cleanUa != null) {
                    pSettings.setUserAgentString(cleanUa);
                }

                CookieManager cm = CookieManager.getInstance();
                cm.setAcceptCookie(true);
                cm.setAcceptThirdPartyCookies(popupWebView, true);
                cm.flush();

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView wv, WebResourceRequest req) {
                        return false;
                    }
                });

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onProgressChanged(WebView vw, int newProgress) {
                        if (newProgress >= 100) {
                            progressBar.setVisibility(View.GONE);
                        } else {
                            progressBar.setVisibility(View.VISIBLE);
                            progressBar.setProgress(newProgress);
                        }
                    }

                    @Override
                    public void onCloseWindow(WebView window) {
                        runOnUiThread(() -> {
                            if (popupDialog.isShowing()) {
                                popupDialog.dismiss();
                            }
                        });
                    }
                });

                container.addView(popupWebView);
                popupDialog.setContentView(container);
                popupDialog.setOnDismissListener(d -> {
                    CookieManager.getInstance().flush();
                    popupWebView.destroy();
                    applyImmersiveFullscreen();
                });
                popupDialog.show();

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
        }
    }
}
`;
fs.mkdirSync(path.dirname(mainActivityPath), { recursive: true });
fs.writeFileSync(mainActivityPath, mainActivityJava);

// 5. Install Spy Station icons across mipmap folders
const anydpiDir = 'android/app/src/main/res/mipmap-anydpi-v26';
if (fs.existsSync(anydpiDir)) {
  fs.rmSync(anydpiDir, { recursive: true, force: true });
}
const iconMap = {
  'mipmap-mdpi': 'public/pwa-96x96.png',
  'mipmap-hdpi': 'public/pwa-144x144.png',
  'mipmap-xhdpi': 'public/pwa-192x192.png',
  'mipmap-xxhdpi': 'public/pwa-384x384.png',
  'mipmap-xxxhdpi': 'public/pwa-512x512.png'
};
for (const [folder, src] of Object.entries(iconMap)) {
  const dir = path.join('android/app/src/main/res', folder);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dir, 'ic_launcher.png'));
    fs.copyFileSync(src, path.join(dir, 'ic_launcher_round.png'));
  }
}
console.log(`Configured Spy Station Android v${versionName} (build ${buildNum}) with single-step dark OAuth modal and immersive fullscreen`);

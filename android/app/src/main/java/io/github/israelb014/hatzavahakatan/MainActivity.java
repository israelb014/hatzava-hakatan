package io.github.israelb014.hatzavahakatan;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // Draw under the display cutout so the game fills the whole screen.
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
            sendCutoutInsets();
        }
    }

    /** Tells the game how far the display cutout (notch / camera hole) reaches in from each side, so the UI can keep clear of it. */
    private void sendCutoutInsets() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || getBridge() == null) return;
        getWindow().getDecorView().post(() -> {
            try {
                android.view.WindowInsets insets = getWindow().getDecorView().getRootWindowInsets();
                android.view.DisplayCutout cutout = insets == null ? null : insets.getDisplayCutout();
                int left = cutout == null ? 0 : cutout.getSafeInsetLeft();
                int right = cutout == null ? 0 : cutout.getSafeInsetRight();
                getBridge().getWebView().evaluateJavascript("window.__hkInsets && window.__hkInsets(" + left + "," + right + ")", null);
            } catch (Exception ignored) {
                // The game falls back to its default margins.
            }
        });
    }

    /** Fullscreen immersive mode: status and navigation bars stay hidden. */
    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}

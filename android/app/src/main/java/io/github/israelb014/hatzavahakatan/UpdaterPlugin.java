package io.github.israelb014.hatzavahakatan;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Downloads a newer APK from GitHub Releases and opens the system installer. */
@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

    @PluginMethod
    public void downloadAndInstall(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || !url.startsWith("https://github.com/israelb014/hatzava-hakatan/")) {
            call.reject("bad url");
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "update");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("cannot create dir");
                File apk = new File(dir, "hatzava-hakatan.apk");
                download(url, apk);
                install(apk);
                call.resolve();
            } catch (Exception e) {
                call.reject("update failed: " + e.getMessage(), e);
            }
        }).start();
    }

    private void download(String address, File target) throws Exception {
        String current = address;
        HttpURLConnection conn = null;
        for (int i = 0; i < 6; i++) {
            conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("User-Agent", "hatzava-hakatan-updater");
            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                String next = conn.getHeaderField("Location");
                conn.disconnect();
                if (next == null || !next.startsWith("https://")) throw new Exception("bad redirect");
                current = next;
                continue;
            }
            if (code != 200) throw new Exception("http " + code);
            break;
        }
        if (conn == null) throw new Exception("no connection");
        long total = conn.getContentLengthLong();
        long done = 0;
        int lastPct = -1;
        try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(target)) {
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                done += n;
                if (total > 0) {
                    int pct = (int) (done * 100 / total);
                    if (pct != lastPct) {
                        lastPct = pct;
                        JSObject data = new JSObject();
                        data.put("percent", pct);
                        notifyListeners("progress", data);
                    }
                }
            }
        } finally {
            conn.disconnect();
        }
        if (done < 100000) throw new Exception("file too small");
    }

    private void install(File apk) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            // The user has to allow installs from this app once; the installer intent below still opens afterwards.
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(settings);
            } catch (Exception ignored) {
                // fall through to the installer, which shows its own prompt
            }
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}

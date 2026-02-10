Sprint Solar Pro â€” Quick Start (Offline)

Thank you for choosing Sprint Solar Pro. This folder contains a selfâ€‘contained, offlineâ€‘capable solar sizing and quotation app you can run locally on Windows or macOS.

Files included

index.html

app.js

assets/         (optional; images and resources)

sprint_solar_icon.png

sprint_solar_icon.ico    (Windows icon, optional)

sprint_solar_icon.icns   (macOS icon, optional)

run_ssp.bat              (Windows launcher)

run_ssp.command          (macOS launcher)

README.txt                              (this file)

Quick start â€” Windows (recommended)

Extract the entire folder to a convenient location (for example, C:\SprintSolarPro).

Doubleâ€‘click run_ssp.bat to launch Sprint Solar Pro in a minimal window.

The launcher prefers Microsoft Edge, then Google Chrome. If neither is found it opens your default browser.

To set a custom app icon on a shortcut:

Rightâ€‘click the desktop shortcut â†’ Properties â†’ Change Iconâ€¦ â†’ Browse â†’ select sprint_solar_icon.ico â†’ OK â†’ Apply.

Optional: create a desktop shortcut for run_ssp.bat (rightâ€‘click â†’ Create shortcut).

Quick start â€” macOS

Extract the folder to a convenient location (for example, /Applications or ~/Applications).

Doubleâ€‘click run_ssp.command to launch.

To set a custom icon:

In Finder select the file, press Cmd+I (Get Info), then drag sprint_solar_icon.icns onto the small icon at the topâ€‘left of the Get Info window.

Using the app

Navigate between pages using the top buttons (Home, System Input, Load, Sizing, Quotation, License Status).

Enter appliances in Load Analysis, calculate sizing, then populate the quotation from sizing.

Export to PDF, print, and share features are available for activated (premium) tiers; they are disabled in Trial mode.

License & activation

If the app opens immediately in a premium tier, a valid license was found in the browser storage or packaged metadata was applied.

To activate manually: open the License page, paste your Gumroad license key and click Activate License. The app performs an online verification for firstâ€‘time activation.

After successful activation the app will work offline on that device until the license expires.

Troubleshooting

App wonâ€™t open: ensure you launched index.html via the provided launcher or open it in a modern browser (Edge or Chrome recommended).

Activation fails with network error: check internet connectivity and that https://gumroad.com is reachable.

Export/print still disabled after activation: reload the app or restart the browser window; check the License page for status and expiry.

Packaged metadata not applied: confirm you used the tierâ€‘specific ZIP and did not remove or edit files inside the package.

If you cleared browser storage, you will need to reâ€‘activate.

Security & distribution notes

Do not share or ship private packaging keys. Any private keys used to sign packaged metadata must remain secure and are not included in distributed ZIPs.

The public key used to verify packaged metadata is embedded in app.js; do not modify it unless you also reâ€‘sign metadata with the matching private key.

Support

If you want a prebuilt Windows shortcut (.lnk) with the icon embedded or a macOS .app bundle for oneâ€‘click install, the developer can provide these on request.

For packaging assistance, verification of packaged metadata, or other support, contact the developer (include order or build details when relevant).

Version

Sprint Solar Pro â€¢ Version: 1.0.0

Notes

Keep the launcher and web files together in the same folder.

This README is included in the product ZIP; please replace it with any localized or companyâ€‘branded instructions if you repackage the product.

Thank you for using Sprint Solar Pro.

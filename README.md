# A Little Date Note & Couple Photo Booth

A no-build, mobile-first date invitation and couple photo booth made with HTML, CSS, and vanilla JavaScript.

## Run locally

Open `index.html` in a browser. For a local HTTP server, run:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Personalize

Edit the `CONFIG` object at the top of `script.js`:

```js
const CONFIG = {
  from: "Your Name",
  to: "Their Name",
  whatsapp: "15551234567",
  photos: ["picnic.jpg", "favorite-day.png"]
};
```

Add configured images to `photos/`. The WhatsApp number should include the country code and contain digits only. Leave it blank to open WhatsApp with the invitation text but no preselected recipient.

Use the menu to switch between the date invitation and the couple photo booth. Add photos in multiple batches (up to 24 total), tap thumbnails to choose which memories to include, then choose Love strip, Sweet collage, or Love note and make a PNG keepsake. The caption and booth style are remembered on that device.
Use the menu to switch between the date invitation and the couple photo booth. Add photos in multiple batches (up to 24 total), tap thumbnails to choose which memories to include, then pick from nine original layouts: Love strip, Sweet collage, Love note, Film roll, Polaroid wall, Heart windows, Scrapbook page, Mini moments, or Memory tickets. The caption and selected style are remembered on that device.

Uploaded images are resized in the browser and stored in local storage on that device. Nothing is uploaded to a server. The invitation's Web Share API is used when available; otherwise, Send opens WhatsApp. The booth's Share button shares the generated PNG where supported, or downloads it as a fallback.

## Deploy to Vercel

Import this folder as a project in Vercel and leave the framework preset as **Other**. No build command or output directory is needed; the static files at the project root are served directly. The `photos/` folder is deployed with the rest of the site.
import sharp from 'sharp';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logoGifPath = join(__dirname, '..', 'static', 'logo.gif');
const logoPngPath = join(__dirname, '..', 'static', 'logo.png');
const staticDir = join(__dirname, '..', 'static');

async function generateFavicons() {
	console.log('🎨 Converting GIF to PNG...');

	// Konvertiere GIF zu PNG (180x123 - Originalgröße beibehalten)
	await sharp(logoGifPath).png().toFile(logoPngPath);

	console.log('✅ Logo converted to PNG');

	console.log('🔨 Generating favicons...');

	// 32x32 Favicon
	await sharp(logoPngPath).resize(32, 32, { fit: 'contain', background: { r: 229, g: 229, b: 229, alpha: 1 } }).toFile(join(staticDir, 'favicon-32x32.png'));

	// 180x180 Apple Touch Icon
	await sharp(logoPngPath).resize(180, 180, { fit: 'contain', background: { r: 229, g: 229, b: 229, alpha: 1 } }).toFile(join(staticDir, 'apple-touch-icon.png'));

	// 512x512 Android Chrome
	await sharp(logoPngPath).resize(512, 512, { fit: 'contain', background: { r: 229, g: 229, b: 229, alpha: 1 } }).toFile(join(staticDir, 'android-chrome-512x512.png'));

	console.log('✅ Favicons generated');

	// Web Manifest erstellen
	const manifest = {
		name: 'TV Muttenz Volleyball',
		short_name: 'TV Muttenz VB',
		icons: [
			{
				src: '/volleyball/android-chrome-512x512.png',
				sizes: '512x512',
				type: 'image/png',
			},
		],
		theme_color: '#FF3500',
		background_color: '#e5e5e5',
		display: 'standalone',
	};

	fs.writeFileSync(join(staticDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));

	console.log('✅ Web manifest created');
	console.log('🎉 All done!');
}

generateFavicons().catch(console.error);

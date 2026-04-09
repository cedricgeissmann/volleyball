import QRCode from 'qrcode';

const BASE_URL = 'https://cedricgeissmann.github.io/volleyball';

/**
 * Erstellt die absolute URL für einen Pfad
 * @param {string} path - Relativer Pfad (z.B. '/teams/herren-1')
 * @returns {string} Absolute URL
 */
export function getAbsoluteURL(path) {
	// Entferne führenden Slash wenn vorhanden
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	return `${BASE_URL}/${cleanPath}`;
}

/**
 * Generiert einen QR-Code als Data URL
 * @param {string} url - URL für den QR-Code
 * @param {number} [size=256] - Größe des QR-Codes in Pixeln
 * @returns {Promise<string>} Data URL des QR-Codes
 */
export async function generateQRCode(url, size = 256) {
	try {
		return await QRCode.toDataURL(url, {
			width: size,
			margin: 2,
			color: {
				dark: '#000000',
				light: '#ffffff',
			},
			errorCorrectionLevel: 'M',
		});
	} catch (error) {
		console.error('QR-Code generation failed:', error);
		return '';
	}
}

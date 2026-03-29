import ImageKit from "imagekit";
import fs from "fs";


const uploadOnImageKit = async (localFilePath) => {

    const imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });

    try {
        if (!localFilePath) {
            console.log('No file path - skipping upload');
            return null;
        }

        // Validate config before upload
        if (!process.env.IMAGEKIT_PUBLIC_KEY?.trim() || !process.env.IMAGEKIT_PRIVATE_KEY?.trim() || !process.env.IMAGEKIT_URL_ENDPOINT?.trim()) {
            console.error(' ImageKit env vars missing/invalid. Add to .env:');
            console.error('  IMAGEKIT_PUBLIC_KEY=public_...')
            console.error('  IMAGEKIT_PRIVATE_KEY=private_...')
            console.error('  IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id/')
            if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
            return null;
        }

        const response = await imagekit.upload({
            file: fs.readFileSync(localFilePath),
            fileName: `chai-player_${Date.now()}.jpg`
        });

        console.log('ImageKit upload success:', response.url);
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        console.error('ImageKit error:', error.message);
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};

export { uploadOnImageKit };
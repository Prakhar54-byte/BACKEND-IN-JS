// import {v2 as cloudinary} from 'cloudinary';
// import fs from "fs"


// cloudinary.config({ 
//     cloud_name: process.env.CLOUDINARY_NAME, 
//     api_key: process.env.CLOUDINARY_API_KEY, 
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const uploadOnCloudinary = async(localFilePath) => {
//     try {
//         if(!localFilePath) return null;
//         //upload image to cloudinary
//         const response = await  cloudinary.uploader.upload(localFilePath, 
//             {resource_type: "auto"}
//         )

//         //file has been uploaded, successfully
//         console.log("File is uploaded on cludinary",response.url);
//         return response

//     } catch (error) {
//         fs.unlinkSync(localFilePath) // remove the locally save temporary file as the upload operation failed
//         return null;
//     }
// }




// export {uploadOnCloudinary }





import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error("No file path provided");
        }

        // Upload image to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // File has been uploaded successfully
        console.log("File is uploaded on Cloudinary", response.url);
        fs.unlinkSync(localFilePath); // Remove the locally saved temporary file as the upload operation succeeded
        return response;

    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);

        // Remove the locally saved temporary file as the upload operation failed
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        // Return error information
        return { error: error.message };
    }
};

export { uploadOnCloudinary };

import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        // //console.log("file is uploaded on cloudinary ", response.url);
        // console.log("file is uploaded on cloudinary ", response);
        // console.log("file is uploaded on cloudinary ", response.secure_url);
        
        
        fs.unlinkSync(localFilePath)
        // console.log("file is deleted from local storage ", localFilePath);
        // remove the locally saved temporary file
        // if(response===null) {
        //     console.log("file is not uploaded on cloudinary ", response);
        //     return null
        // }
        
        return response // return the url of the uploaded file;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        console.log("Error while uploading file on cloudinary ", error);
        return null;
    }
}



export {uploadOnCloudinary}
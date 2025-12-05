// import {v2 as cloudinary} from "cloudinary"
// import fs from "fs"


// cloudinary.config({ 
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET 
// });

// const uploadOnCloudinary = async (localFilePath) => {
//     try {
//         if (!localFilePath) return null
//         //upload the file on cloudinary
//         const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type: "auto"
//         })
//         // file has been uploaded successfull
//         // //console.log("file is uploaded on cloudinary ", response.url);
//         // console.log("file is uploaded on cloudinary ", response);
//         // console.log("file is uploaded on cloudinary ", response.secure_url);
        
        
//         fs.unlinkSync(localFilePath)
//         // console.log("file is deleted from local storage ", localFilePath);
//         // remove the locally saved temporary file
//         // if(response===null) {
//         //     console.log("file is not uploaded on cloudinary ", response);
//         //     return null
//         // }
        
//         return response // return the url of the uploaded file;

//     } catch (error) {
//         fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
//         console.log("Error while uploading file on cloudinary ", error);
//         return null;
//     }
// }



// export {uploadOnCloudinary}




import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


cloudinary.config({ 
  
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET ,
  timeout: 120000 // Set a timeout of 60 seconds for upload operations
});

cloudinary.api.ping()
    .then(() => console.log("Cloudinary connection successful"))
    .catch(err => console.error("Error connecting to Cloudinary:", err));

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    });

    // Attempt to delete local file after upload
    try {
      fs.unlinkSync(localFilePath);
    } catch (unlinkErr) {
      console.warn("Warning: Could not delete local file", localFilePath, unlinkErr.message);
    }

    return response;
  } catch (error) {
    // Attempt to delete local file even if upload fails
    try {
      fs.unlinkSync(localFilePath);
    } catch (unlinkErr) {
      // ignore
    }
    console.error("Error while uploading file on cloudinary", error);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      console.warn("No publicId provided for deletion");
      return false;
    }

    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Error while deleting file from cloudinary", error);
    return false;
  }
};

export { uploadOnCloudinary ,deleteFromCloudinary};

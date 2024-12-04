
import { asyncHandler } from "../utils/asyncHandler.js";




const registerUser = asyncHandler(async(req,res)=>{
    // This is mine
    // 1. check if user exist
    // 2.if not then creat if yes then continue
    // 3. to crate use email and password
    // 4. login user


    // This is from the tutorial
    // get user details from frontend
    // validation - not empty
    // check if user already exists username or email
    // check for images , check for avtar
    // upload to cloudinary , avatar 
    // create user object (to send in mongodb as they are noSQL) - create entry in database
    // remove password and refreshToken from the response
    // check for user creation
    // return res
    const {fullName, email, password,username} = req.body;
    console.log("User Details", req.body);
    
})


export { registerUser }
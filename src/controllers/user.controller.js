
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async(req,res)=>{
    // This is mine
    // 1. check if user exist
    // 2.if not then creat if yes then continue
    // 3. to crate use email and password
    // 4. login user


    // This is from the tutorial
    // 1.get user details from frontend
    // 2.validation - not empty
    // 3.check if user already exists username or email
    // 4.check for images , check for avtar
    // 5.upload to cloudinary , avatar 
    // 6.create user object (to send in mongodb as they are noSQL) - create entry in database
    // 7.remove password and refreshToken from the response
    // 8.check for user creation
    // 9.return res
    res.status(200).json({
        success:true,
        message:"User Registered Successfully"
    })

// Step 1
   const {fullName, email, password,username} = req.body;
    console.log("Email",email);

//Step 2
    if(fullName===""){
        throw new ApiError(400,"Full Name is required");
    }
    if (
        [email.username,password].some((field)=>field?.trim()==="")
    ) {
        throw new ApiError(400,"All fields are required");
    }

//Step 3
    const existedUser = User.findOne({
        $or:[{username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User already exists");
    }
//Step 4

    const avatarlocalPath = req.files?.avatar[0]?.path
    const coverImagelocalPath = req.files?.coverImage[0]?.path

    if(!avatarlocalPath){
        throw new ApiError(400,"Avatar is required");
    }
// Step5
    const avatar = await uploadOnCloudinary(avatarlocalPath)
    const coverImage = await uploadOnCloudinary(coverImagelocalPath)

    if(!avatar || !coverImage){
        throw new ApiError(500,"Cloudinary Error");
    }

// Step 6


   const user =  await User.create({
        fullName,
        avatar : avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()

    })
// Step 7
   const createdUser =  await User.findById(user._id).select(
    "-password -refreshToken"
   )

// Step 8
    if(!createdUser){
        throw new ApiError(500,"User not created");
    }
// Step 9
    return registerUser.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )
})



export { registerUser }
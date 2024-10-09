import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshToken = async (userId) => 
    {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken() 
        
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
  // 1. user input data from frontend
  // 2. check the input is correct or not (validation) - not empty
  // 3. if wrong give error
  // 4. check if user already exists (by username and  email)
  // 5. check for images and avtar
  // 6. upload them to cloudinary , avtar
  // 7. create user object - create entry in database
  // 8. remove password and refreshToken from response
  // 9. check for user creation
  // 10. return response

const { fullName, email, username, password } = req.body;
//   console.log("email :", email);

  // if(fullName === "" || email === "" || username === "" || password === ""){
  //     res.status(400)
  //     throw new ApiError(400,"Fullname is reqired")
  // }
    // if (
    // [fullName, email, username, password].some((field) => {
    //     field?.trim() === "";
    // })
    // )    {
    // throw new ApiError(400, "All fields are required");
    // }
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    console.log("This is body part: ",req.body);
    console.log("This is file part: ",req.files);
    
    


    const existedUser = await User.findOne({
    $or: [{email:email} , {username:username}]
    })


    if(existedUser){
    throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
    console.log("Avatar file is required");
    
    
    }


    // STEP 6 - Upload images to cloudinary
    const avatar = await   uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar upload failed")
    }


    // STEP 7 - Create user object
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    // STEP 8 - Remove password and refreshToken from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    
    // STEP 9 - Check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while creating user")
    }

    // STEP 10 - Return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, " User registered successfully")
    )



console.log(req.files);



});



const logInUser = asyncHandler(async (req, res) => {
    // 1. user input from frontend{email,password}
    // 2. validate it
    // 3. if user exists give message(call monogdb and check if user exists)
    // 4. check if password is correct
    // 5. access token and refresh token
    // 6. send cookies

    const { email,password } =req.body

    if(!email ){
        throw new ApiError(400,"Email is required")
    }

    const user = await User.findOne({
        email:email
    })

    if(!user){
        throw new ApiError(404,"User not found")
    }


    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Password is incorrect")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const logedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options= { // cookie options for access token 
        httpOnly:true, // cookie is not accessible by javascript
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user:logedInUser,accessToken,refreshToken // sending user details and tokens
        },
    "User logged in successfully")
    )
    
});


const logOutUser = asyncHandler(async (req,res)=>{
    // 1. clear cookies
    // 2. delete refresh token from database
    // 3. send response

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new : true
        }
        
    )

    const options = {
        httpOnly:true,
        secure:true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,undefined,"User is logged out successfully")
    )



    
})

export { 
    registerUser,
    logInUser,
    logOutUser

};

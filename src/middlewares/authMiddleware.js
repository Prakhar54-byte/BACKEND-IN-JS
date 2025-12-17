import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

const isTestEnv = Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === 'test';

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {

        
        let token = req.cookies?.accessToken || req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    
    // Special handling for Next.js development
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((cookies, cookie) => {
        const [name, value] = cookie.trim().split('=');
        cookies[name] = value;
        return cookies;
      }, {});
      token = cookies.accessToken;
    }

    if (!token || token === "null" || token === "undefined") {
      if (!isTestEnv) console.warn("Token missing in request");
      throw new ApiError(401, "Unauthorized request - Token missing");
    }

    // Additional token format validation
    if (typeof token !== "string" || !token.includes(".")) {
      if (!isTestEnv) console.warn("Malformed token in request");
      throw new ApiError(401, "Invalid token format");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})
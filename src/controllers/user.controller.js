import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user alredy exist: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return response 

    const {fullName, email, username, password} = req.body
    
    if (
        [fullName,email,username,password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400,"All field are required")
    }

    const response = await User.findOne({
        $or:[{ email }, { username }]
    })

    if(response) {
        throw new ApiError(409,"User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImage = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    } 

    const avatar = await uploadonCloudinary(avatarLocalPath)
    await uploadonCloudinary(coverImage)

    if (!avatar) {
        throw new ApiError(400,"Avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registring the user")
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser,"User registered successfully")
    )

} )


const loginUser = asyncHandler( async(req,res) => {
    // get (username or email) and password
    // check user exist or not 
    // if exist generate token 
    // check password is coorect of not
    // return the token to the user
    // send cookie

    const {username, email, password} = req.body

    if (!username && !email) {
        throw new ApiError(400,"username or email is required")
    }

    const findUser = await User.findOne({$or:[{ email }, { username }]})

    if (!findUser) {
        throw new ApiError(400,"no user found for given details")
    }

    const isPasswordValid = await findUser.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(400,"Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefefreshTokens(findUser._id)

    const loggedInUser = await User.findById(findUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json( 
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged In successfully"
        )
    )

})

const logoutUser = asyncHandler( async(req,res) => {
    console.log(req.user._id)
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },{
            new:true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))

})

const refreshAccessToken = asyncHandler( async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshToken

    if (incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken).select("-password -refreshToken")
    
        if(!user) {
            throw new ApiError(401,"Invalid refresh Token")
        }
    
        if(incomingRefreshToken != user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {newRefreshToken,accessToken} = await generateAccessAndRefefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken",newRefreshToken)
        .json(
            new ApiResponse(200,{accessToken,newRefreshToken},
                "Access Token refresh successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.messsage || "Error generating accessToken")
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}
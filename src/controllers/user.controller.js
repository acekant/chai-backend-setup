import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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
            $unset:{
                refreshToken: 1
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

    if (!incomingRefreshToken) {
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

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(user.req.id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(401,"Invalid user password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"));

})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res
    .status(200)
    .json(200,req._user,"Current User fetch successfully")
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    const {fullName, email} = req.body

    if (!fullname && !email) {
        throw new ApiError(400,"All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))

})


const updateUserAvatr = asyncHandler(async (req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(404,"Avatar file is missing");
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)

    if(avatar.url) {
        throw new ApiError(404,"Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {$set:{avatar:avatar.url}},
        {new: true}
    )

    if (!user) {
        throw new ApiError(401,"Error while uploading the Avatar")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,"","Updated Avatar"))
})

const updateUserCoverImage = asyncHandler(async (req,res) => {
    const avatarLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(404,"Avatar file is missing");
    }

    const coverImage = await uploadonCloudinary(coverImageLocalPath)

    if(coverImage.url) {
        throw new ApiError(404,"Error while uploading on coverImage");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {$set:{coverImage:coverImage.url}},
        {new: true}
    )

    if (!user) {
        throw new ApiError(401,"Error while uploading the CoverImage")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,"","Updated coverImage"))
})

const getUserChannelProfile = asyncHandler(async (req,res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400,"Username is missing")
    }

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username:username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelsSubcribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user?._id,"$subscribers.req.user?._id"]},
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName:1,
                    username:1,
                    subscribersCount:1,
                    channelsSubcribedToCount:1,
                    isSubscribed:1,
                    avatar:1,
                    coverImage:1,
                    email:1
                }
            }
            
        ])

    console.log(channel)
    if (!channel?.length) {
        throw new ApiError(404,"channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"fetched successfully")
    )

})


const getWatchHistory = asyncHandler(async (req,res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
           $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [
                {
                    $lookup:{
                        from:"users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [
                            {
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    }
                },
                {
                    $addFields: {
                        owner: {
                            $first: "$owner"
                        }
                    }
                }
            ]
           } 
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch history fetched seccessfully")
    )

})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateUserAvatr,
    updateUserCoverImage,
    getWatchHistory,
    updateAccountDetails,
    getUserChannelProfile

}
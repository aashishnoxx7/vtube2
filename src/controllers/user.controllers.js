import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
//import { use } from "react"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userID) =>{
    try {
        const user = await User.findById(userID)
        if(!user) {
            throw new ApiError(404, "User not found")
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken, refreshToken}
    } catch (error) {
        console.log("Error generating access and refresh token...", error)
        throw new ApiError(500, "Failed to generate access and refresh token")
    }
}

const registerUser = asyncHandler( async(req,res) => {
    //TODO
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    const {fullName, email, username, password} = req.body

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required!")
    }

    const existedUser = await User.findOne({
        $or : [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with given email or username already exists...")
    }
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing...")
    }
//     const avatar = await uploadOnCloudinary(avatarLocalPath)
//     let coverImage = "";
// if (coverLocalPath) {
//     const uploadedCoverImage = await uploadOnCloudinary(coverLocalPath);
//     coverImage = uploadedCoverImage?.url || "";
// }

    let avatar;

    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        if (!avatar) throw new Error("Upload failed");
        console.log("Uploaded avatar", avatar)
    } catch (error) {
        console.log("Error uploading avatar", error)
        throw new ApiError(500, "Failed to upload avatar")
    }

    let coverImage = "";
if (coverLocalPath) {
    try {
        const uploadedCoverImage = await uploadOnCloudinary(coverLocalPath);
        if (!avatar) throw new Error("Upload failed");
        console.log("Uploaded Cover Image", uploadedCoverImage);
        coverImage = uploadedCoverImage?.url || "";
    } catch (error) {
        console.log("Error uploading coverImage", error);
        throw new ApiError(500, "Failed to upload coverImage");
    }
}
    try {
        const user = await User.create({
            fullName,
            avatar : avatar.url,
            coverImage : coverImage|| "",
            email,
            password,
            username : username.toLowerCase()
        })
        const createdUser = await User.findById(user._id).select(
            " -password -refreshToken"
        )
        if(!createdUser){
            throw new ApiError(500, "Something went wrong while registering the user")
        }
    
        return res
        .status(201)
        .json( new ApiResponse(200, createdUser, "User registered successfully..."))
        
    } catch (error) {
        console.log("User registration failed", error)
        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }
        throw new ApiError(500, "Registration failed and images were deleted");
    }

    console.log("Request received");
console.log("Request body:", req.body);
console.log("Request files:", req.files);

})

const loginUser = asyncHandler( async(req, res) => {
    
    //get data from req body
    const {email, password} = req.body

    //validate data
    if(!email || !password){
        throw new ApiError(400, "Email and password are required")
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, "User not found")
    }

    //validate password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Password is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedUser = await User.findById(user_id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly : true,
        secure : true,
        //sameSite : "none"
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
        200,
        {user : loggedUser, accessToken, refreshToken},
        "User logged in successfully..."
    ))


})

const refreshAccessToken = asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is missing")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401, "Invalid refresh Token")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Invalid refresh Token...")
        }

        const options = {
            httpOnly : true,
            secure : true,
            //sameSite : "none"
        }
        const {accessToken, refreshToken : newRefreshToken} = 
        await generateAccessAndRefreshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(
            200,
            {accessToken, 
                refreshToken : newRefreshToken
            },
            "Access token refreshed successfully..."
        ))
        
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing access token")

    }

})

const logOut = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
                //refreshToken : null
                //refreshToken : ""
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : process.env.NODE_ENV === "production",
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(
        200,
        {},
        "User logged out successfully..."
    ))

})
//change password

const changeCurrentPassword = asyncHandler( async(req, res) => {
    const {currentPassword, newPassword} = req.body
    
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save( {
        validateBeforeSave : false
    })
    return res.status(200)
    .json(new ApiResponse(
        200,
        {},
        "Password changed successfully..."
    ))

})

//get current user

const getCurrentUser = asyncHandler( async(req, res) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user, "User details fetched successfully..."))
})

//update account details

const updateAccountDetails = asyncHandler( async(req, res) => {
    const {fullName, email, username} = req.body
    
    if(!fullName){
        throw new ApiError(400, "Full name is required")
    }
    if(!email){
        throw new ApiError(400, "Email is required")
    }
    if(!username){
        throw new ApiError(400, "Username is required")
    }
    User.findById().select("-password")
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email : email.toLowerCase(),
                username: username.toLowerCase()
            }
        },
        {
            new : true
        }
    ).select("-password -refreshToken")

    await user.save()

    return res.status(200)
    .json(new ApiResponse(
        200,
        {},
        "Account details updated successfully..."
    ))
})

//update user avatar

const updateAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing...")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    //checked if its available
    if(!avatar.url){
        throw new ApiError(500, "Failed to upload avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password -refreshToken")

    res.status(200)
    .json(new ApiResponse(
        200,
        user,
        "Avatar updated successfully..."
    ))
})

//update cover image

const updateCoverImage = asyncHandler( async(req, res) => {
    const coverLocalPath = req.file?.path

    if(!coverLocalPath){
        throw new ApiError(400, "Cover Image file is missing...")
    }
    const coverImage = await uploadOnCloudinary(coverLocalPath)

    //checked if its available
    if(!coverImage.url){
        throw new ApiError(500, "Failed to upload cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password -refreshToken")

    res.status(200)
    .json(new ApiResponse(
        200,
        user,
        "Cover image updated successfully..."
    ))
})

const getUserChannelProfile = asyncHandler( async(req, res) => {
    const { username } = req.params

    if(!username){
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        //Injecting pipelines
        {
            //Match the username...
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            //Find the subscription channel from id
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {   
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        //add fields to the pipeline below code
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelSubscribedTo : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {
                            //Check whether id of this is present or not
                            $in : [req.user?._id, "$subscribers.subscriber"]
                        },
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            //Project only the required fields
            $project : {
                fullName : 1,
                username : 1,
                avatar : 1,
                subscribersCount : 1,
                channelSubscribedTo : 1,
                isSubscribed : 1,
                coverImage : 1,
                email : 1
            }
        }
    ])

    console.log("Channel", channel)
    if(!channel ?.length){
        throw new ApiError(404, "Channel not found")
    }
    // console.log("Channel", channel),
    return res.status(200)
    .json(new ApiResponse(
        200,
        channel[0],
        "Channel profile fetched successfully..."
    ))
})

const getWatchHistory = asyncHandler( async(req, res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id : new Mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    }, 
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if(!user){
        throw new ApiError(404, "User not found")
    }
    return res.status(200)
    .json(new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully..."
    ))
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logOut,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage
}

//add google login

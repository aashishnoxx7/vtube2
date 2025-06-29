import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
  try {
    //  Extract query parameters from the frontend URL
    // Example URL: /videos?page=2&limit=5&query=cats&sortBy=createdAt&sortType=desc
    const page = parseInt(req.query.page) || 1;     // Page number (default: 1)
    const limit = parseInt(req.query.limit) || 10;  // Videos per page (default: 10)
    const { query, sortBy, sortType } = req.query;

    //  Validate page and limit are proper numbers
    if (isNaN(page) || isNaN(limit)) {
      throw new ApiError(400, "Invalid page or limit parameter");
    }
    if (!sortBy || !validSortFields.includes(sortBy)) {
      throw new ApiError(400, "Invalid or missing sort field");
    }




    //  Require search query from frontend (e.g., ?query=football)
    if (!query) {
      throw new ApiError(400, "Query parameter is required");
    }

    //  Allow sorting only by specific fields
    const validSortFields = ["title", "description", "createdAt"];
    if (!validSortFields.includes(sortBy)) {
      throw new ApiError(400, "Invalid sort field");
    }

    //  Sorting direction must be 'asc' or 'desc'
    if (sortType !== "asc" && sortType !== "desc") {
      throw new ApiError(400, "Invalid sort type");
    }

    //  Build MongoDB filter to search title or description (case-insensitive)
    const queryObject = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ]
    };

    //  Fetch videos with filtering, sorting, and pagination
    const videos = await Video.find(queryObject)
      .sort({ [sortBy]: sortType === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    //  Count total matching videos to calculate total pages
    const count = await Video.countDocuments(queryObject);
    const totalPages = Math.ceil(count / limit);

    //  Send response back to frontend
    res.json(
      new ApiResponse(200, {
        videos,           // Array of video objects for this page
        totalPages,       // Total number of pages
        currentPage: page // Current page number
      })
    );
  } catch (error) {
    console.log("Error getting all videos...", error);
    throw error;
  }
});



const publishAVideo = asyncHandler(async (req, res) => {
    
    // TODO: get video, upload to cloudinary, create video
    try {
      
      const { videoId } = req.params
      const { title, description } = req.body;

      if (!title || !description) {
      throw new ApiError(400, "Title and description are required");
      }

      if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
      }

      const video = await Video.findById(videoId)

      if(!video) {
        throw new ApiError(404, "Video not found")
      }

      if(video.published) {
        throw new ApiError(400, "Video already published")
      }
      video.title = title;
      video.description = description;
      video.published = true
      await video.save()
      res.json(new ApiResponse
        (
          200,
          "Video published successfully",
          video
        )
      )

    } catch (error) {
      console.log("Error publishing video...", error);
      // Re-throw if it's already an ApiError
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to publish video")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    try {
      if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
      }
      const video = await Video.findById(videoId)

      if(!video) {
        throw new ApiError(404, "Video not found")
      }

      res.json(
        new ApiResponse (
          200,
          "Video fetched successfully",
          video
        )
      )
    } catch (error) {
      console.log("Error getting video by id...", error);
      throw new ApiError(500, "Failed to get video by id")
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail

    try {
      const { videoId } = req.params
      const {title, description} = req.body

      if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
      }

      if(!title || !description) {
        throw new ApiError(400, "Title and description are required");
      }

      const video = await Video.findById(videoId)
      if(!video) {
        throw new ApiError(404, "Video not found")
      }

      video.title = title;
      video.description = description;
      await video.save()
      res.json(new ApiResponse
        (
          200,
          "Video updated successfully",
          video
        )
      )

    } catch (error) {
      console.log("Error updating video...", error);
      throw new ApiError(500, "Failed to update video")
    }

})

const deleteVideo = asyncHandler(async (req, res) => {
    try {
      const { videoId } = req.params
      //TODO: delete video
      if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
      }
      const video = await Video.findByIdAndDelete(videoId)



      if(!video) {
        throw new ApiError(404, "Video not found")
      }

      await deleteFromCloudinary(video.public_id);

      
      res.json(
        new ApiResponse (
          200,
          "Video deleted successfully",
          video
        )
      )

    } catch (error) {
      console.log("Error deleting video...", error);
      throw new ApiError(500, "Failed to delete video")
      
    }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
  //toggle video publish status means publish or unpublish  
  try {
      const { videoId } = req.params

      if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
      }

      const video = await Video.findById(videoId)
      
      if(!video) {
        throw new ApiError(404, "Video not found")
      }

      video.published = !video.published
      await video.save()
      res.json(new ApiResponse
        (
          200,
          "Video published status toggled successfully",
          video
        )
      )


    } catch (error) {
      console.log("Error toggling publish status...", error);
      throw new ApiError(500, "Failed to toggle publish status")
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
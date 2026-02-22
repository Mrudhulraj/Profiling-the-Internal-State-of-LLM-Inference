import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    post: null,
}

export const postSlice = createSlice({
    name: 'posts',
    initialState,
    reducers: {
        setUploadingPost: (state, action) => {
            state.post = action.payload
        },

        removeUploadingPost: (state) => {
            state.post = null
        },
    },
})

export const { setUploadingPost, removeUploadingPost } = postSlice.actions

export const selectUploadingPost = (state) => state.uploadingPost

export default postSlice.reducer

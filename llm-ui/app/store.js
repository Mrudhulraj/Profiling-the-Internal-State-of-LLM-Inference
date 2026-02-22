import { configureStore } from '@reduxjs/toolkit'
import userSlice from '../slices/userSlice'
import postSlice from '../slices/postSlice'

export const store = configureStore({
    reducer: {
        activeUser: userSlice,
        uploadingPost: postSlice,
    },
})

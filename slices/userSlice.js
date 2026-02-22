import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    activeUser: null,
    activeTag: '',
    isAuthenticated: false,
}

export const userSlice = createSlice({
    name: 'activeUser',
    initialState,
    reducers: {
        setActiveUser: (state, action) => {
            state.activeUser = action.payload.activeUser
            state.activeTag = action.payload.activeTag
            state.isAuthenticated = action.payload.isAuthenticated
        },

        removeActiveUser: (state) => {
            state.activeUser = null
            state.activeTag = ''
            state.isAuthenticated = false
        },
    },
})

export const { setActiveUser, removeActiveUser } = userSlice.actions

export const selectActiveUser = (state) => state.activeUser.activeUser
export const selectActiveTag = (state) => state.activeUser.activeTag

export default userSlice.reducer

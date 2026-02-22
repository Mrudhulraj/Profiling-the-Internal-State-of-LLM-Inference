import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectActiveUser, setActiveUser } from '../slices/userSlice'
import axiosInstance from '../utils/axiosInstance'
import { parseCookies } from 'nookies'

const Navbar = () => {
    const [user, setUser] = useState<any>(null)

    const activeUser = useSelector(selectActiveUser)

    const router = useRouter()

    const dispatch = useDispatch()

    const [openDropdown, setOpenDropdown] = useState(false)

    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        if (!activeUser) {
            axiosInstance({
                url: '/dj-rest-auth/user/',
                method: 'GET',
            })
                .then((result) => {
                    axiosInstance
                        .get(`/api/users/${result.data.username}`)
                        .then((result) => {
                            setUser(result.data)
                            const payload = {
                                activeUser: result.data,
                                activeTag: result.data.username,
                                isAuthenticated: true,
                            }

                            dispatch(setActiveUser(payload))
                        })
                        .catch((error) => {
                            console.log(error)
                            const emptyPayload = {
                                activeUser: null,
                                activeTag: '',
                                isAuthenticated: false,
                            }
                            dispatch(setActiveUser(emptyPayload))
                        })
                })
                .catch((error) => {
                    console.log(error)
                    const emptyPayload = {
                        activeUser: null,
                        activeTag: '',
                        isAuthenticated: false,
                    }
                    dispatch(setActiveUser(emptyPayload))
                })
        }
    }, [])

    const handleLogout = async (e: any) => {
        e.preventDefault()

        const cookies = parseCookies()

        const logoutBody = JSON.stringify({
            csrfmiddlewaretoken: cookies.csrftoken,
        })

        axiosInstance({
            url: '/dj-rest-auth/logout/',
            data: logoutBody,
            method: 'POST',
        })
            .then(() => {
                localStorage.removeItem('access')
                localStorage.removeItem('refresh')
                const emptyPayload = {
                    activeUser: null,
                    activeTag: '',
                    isAuthenticated: false,
                }
                dispatch(setActiveUser(emptyPayload))
                router.push('/')
            })
            .catch((error) => {
                console.log(error)
            })
    }

    return (
        <div className="sticky top-0 z-50 border-b border-blue-500 bg-[#0F0F0F]">
            <div className="mx-auto flex w-5/6 items-center justify-between rounded-xl py-[15px] text-[20px]">
                <div
                    className="flex cursor-pointer items-center space-x-3 font-bold"
                    onClick={() => router.push('/')}
                >
                    <img
                        src={'/Assets/Blue_logo.png'}
                        className="w-[3rem] rounded-full"
                        onLoad={() => setLoaded(true)}
                    />

                    <h1 className="hidden font-montserrat text-xl md:inline-block">
                        INFERENCE MODELS
                    </h1>
                </div>
                {/* ) : (
                    // <h1>Loading...</h1>
                    <div className="animate-pulse rounded-full bg-gray-500 p-6" />
                )} */}
            </div>
        </div>
    )
}

export default Navbar

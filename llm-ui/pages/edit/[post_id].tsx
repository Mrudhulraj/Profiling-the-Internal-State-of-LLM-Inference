import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'
import Head from 'next/head'
import axios from 'axios'
import { useState, useEffect } from 'react'
import LikeIcon from '../../icons/LikeIcon'
import CommentIcon from '../../icons/CommentIcon'
import { selectActiveUser } from '../../slices/userSlice'
import { useSelector } from 'react-redux'
import { userData } from '../../utils/typings'
import ViewIcon from '../../icons/ViewIcon'
import axiosInstance from '../../utils/axiosInstance'
import ChevronLeftIcon from '../../icons/ChevronLeftIcon'

const EditPost = () => {
    const router = useRouter()
    const { post_id } = router.query

    const activeUser = useSelector(selectActiveUser)
    const [gamerTag, setGamerTag] = useState('')

    const [title, setTitle] = useState('')
    const [caption, setCaption] = useState('')

    const [post, setPost] = useState<any>()
    const [userData, setUserData] = useState<userData>()

    const [hasSaved, setHasSaved] = useState(false)

    const [errors, setErrors] = useState<any>([])

    useEffect(() => {
        axios
            .get(`${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/csrf-token/`)
            .catch(() => {
                alert('Error message.')
            })
    }, [])

    useEffect(() => {
        const fetchVideo = async () => {
            const postObj = await axios.get(
                `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/posts/${post_id}`
            )

            return postObj
        }

        const fetchUser = async (userGamerTag: any) => {
            const userObj = await axios.get(
                `${process.env.NEXT_PUBLIC_RELOAD_API_URL}/api/users/${userGamerTag}`
            )

            return userObj
        }

        fetchVideo()
            .then((result) => {
                setPost(result.data)
                setTitle(result.data.title)
                setCaption(result.data.caption)
                setGamerTag(result.data.gamer_tag)
                fetchUser(result.data.gamer_tag)
                    .then((result) => {
                        setUserData(result.data)
                    })
                    .catch((error) => {
                        console.log(error)
                    })
            })
            .catch((error) => {
                console.log(error.message)
            })
    }, [post_id])

    const handleEditPost = (e: any) => {
        e.preventDefault()

        const FormData = require('form-data')
        const data = new FormData()

        data.append('title', title)
        data.append('caption', caption)

        axiosInstance({
            method: 'PATCH',
            url: `/api/posts/${post_id}/`,
            data: data,
        })
            .then(() => {
                setHasSaved(true)
                setTimeout(() => {
                    setHasSaved(false)
                }, 3000)
            })
            .catch((error) => {
                console.log(error)
                let tempErrors = []
                if (!title) {
                    tempErrors.push('The title cannot be empty')
                }
                if (!caption) {
                    tempErrors.push('The caption cannot be empty')
                }

                setErrors(tempErrors)

                setTimeout(() => {
                    setErrors([])
                }, 5000)
            })
    }

    return (
        <div>
            <Head>
                <title>Edit Post - {post?.title}</title>
            </Head>

            <Navbar />

            <div className="mx-auto w-full max-w-6xl rounded-lg py-10">
                <div className="flex items-center space-x-6">
                    <div
                            onClick={() =>
                                router.push(`/profile/${gamerTag}`)
                        }
                        className="flex h-[40px] w-[40px] pl-2 pr-4 cursor-pointer items-center justify-center border-r-2 hover:scale-110 transition duration-300"
                    >
                        <ChevronLeftIcon />
                    </div>
                    <div className='flex'>
                        <h1 className="flex-cols font-montserrat text-3xl font-semibold text-blue-500">
                            Edit Post - 
                        </h1>
                        <h1 className='ml-2 flex font-montserrat text-3xl font-semibold'>
                            {post?.title}
                        </h1>
                    </div>
                </div>
                <div className="mt-[12px] h-1 w-full rounded-lg bg-[#6288FF] mb-6" />
                <div className="min-h-[154px] min-w-[332px] shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.3)] shadow-[#6300B4]">
                    {post?.video && (
                        <video
                            width="100%"
                            height="100%"
                            controls
                            className="rounded-lg"
                        >
                            <source src={post?.video} type="video/mp4" />
                        </video>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="mt-7 w-full">
                        <div className="flex w-full items-start space-x-6 px-6 lg:px-0">
                            <div className="h-[72px] w-[72px]">
                                {/* user profile picture goes here */}
                                <img
                                    src={
                                        userData?.profile_pic
                                            ? userData?.profile_pic
                                            : '/Assets/defaultAvatar.png'
                                    }
                                    alt=""
                                    className="h-full w-full rounded-full"
                                />
                            </div>

                            <div className="flex w-full flex-col items-start space-y-1 lg:flex-row lg:justify-between">
                                <div className="w-4/5">
                                    <div className="flex cursor-pointer flex-col items-start space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-7">
                                        <h1
                                            onClick={() =>
                                                router.push(
                                                    `/profile/${userData?.username}`
                                                )
                                            }
                                            className="text-2xl font-semibold text-[#6288ff]"
                                        >
                                            {userData?.username}
                                        </h1>

                                        <button
                                            onClick={() =>
                                                router.push(
                                                    `/home/${post?.game_category}`
                                                )
                                            }
                                            className="rounded-lg bg-[#6288ff] px-5 py-1 text-xs italic"
                                        >
                                            {post?.game_category}
                                        </button>
                                    </div>

                                    {errors &&
                                        errors.map((error: string) => (
                                            <h1 className="text-red-500">
                                                {error}
                                            </h1>
                                        ))}

                                    <div className="flex w-full flex-col items-start md:flex-row md:items-center md:space-x-4">
                                        <label className="w-1/4">Title</label>
                                        <input
                                            name="name"
                                            className="my-5 w-full rounded-md bg-gray-600 p-2 text-white"
                                            type="text"
                                            value={title}
                                            onChange={(e) =>
                                                setTitle(e.target.value)
                                            }
                                            placeholder="Enter your new title here"
                                        />
                                    </div>

                                    <div className="flex w-full flex-col items-start md:flex-row md:items-center md:space-x-4">
                                        <label className="w-1/4">Caption</label>
                                        <input
                                            name="name"
                                            className="w-full rounded-md bg-gray-600 p-2 text-white"
                                            type="text"
                                            value={caption}
                                            onChange={(e) =>
                                                setCaption(e.target.value)
                                            }
                                            placeholder="Enter your new caption here"
                                        />
                                    </div>

                                    <button
                                        onClick={handleEditPost}
                                        className="rouned-xl mt-5 rounded-xl border-2 border-[#3dbb3a] px-4 py-2 hover:border-green-300 hover:bg-[#3dbb3a]/80 hover:scale-110 transition ease-in-out duration-300"
                                    >
                                        {!hasSaved
                                            ? 'Save changes'
                                            : 'Changes Saved!'}
                                    </button>
                                </div>

                                <div className="flex items-center space-x-10">
                                    <div
                                        className={
                                            activeUser
                                                ? 'mt-[20px] flex flex-col items-center'
                                                : 'mt-[20px] flex cursor-not-allowed flex-col items-center'
                                        }
                                    >
                                        <LikeIcon />
                                        <p className="text-[16px] font-semibold">
                                            {post?.liked_by?.length}
                                        </p>
                                    </div>

                                    <div
                                        className={
                                            activeUser
                                                ? 'mt-[20px] flex flex-col items-center'
                                                : 'mt-[20px] flex cursor-not-allowed flex-col items-center'
                                        }
                                    >
                                        <CommentIcon />
                                        <p className="text-[16px] font-semibold">
                                            {post?.comments.length}
                                        </p>
                                    </div>

                                    <div
                                        className={
                                            activeUser
                                                ? 'mt-[20px] flex flex-col items-center'
                                                : 'mt-[20px] flex cursor-not-allowed flex-col items-center'
                                        }
                                    >
                                        <ViewIcon />
                                        <p className="text-[16px] font-semibold">
                                            {post?.views}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EditPost

import { useState } from 'react'
import { UserPost } from '../utils/typings'
import OptionsIcon from '../icons/OptionsIcon'
import ViewIcon from '../icons/ViewIcon'
import { useRouter } from 'next/router'
import PostShareIcon from '../icons/PostShareIcon'
import DeleteIcon from '@mui/icons-material/Delete'
import { useSelector } from 'react-redux'
import { selectActiveUser } from '../slices/userSlice'
import UserLikeIcon from '../icons/UserLikeIcon'
import EditIcon from '../icons/EditIcon'
interface Props {
    post: UserPost
    openModal: (id: number) => any
}

const UserPostComponent = ({ post, openModal }: Props) => {
    const router = useRouter()

    const [showOptions, setShowOptions] = useState(false)

    const activeUser = useSelector(selectActiveUser)

    const [deleted] = useState(false)

    const [copied, setCopied] = useState(false)

    const [loaded, setLoaded] = useState(false)

    const dynamicLink = `${process.env.NEXT_PUBLIC_RELOAD_FRONTEND_URL}/post/${post?.id}`

    return (
        <div className="group w-full cursor-pointer">
            <div className="relative mx-auto mb-5 cursor-pointer overflow-hidden rounded-xl transition duration-500 group-hover:shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.3)] group-hover:shadow-[#6300B4] lg:h-[210px] 3xl:h-[210px]">
                <img
                    src={loaded ? post.thumbnail : '/Assets/loading_bg.png'}
                    className="transiton h-full w-full rounded-xl duration-300 group-hover:scale-105"
                    onClick={() => router.push(`/post/${post.id}`)}
                    onLoad={() => setLoaded(true)}
                />
                <button
                    onClick={() => router.push(`/home/${post.game_category}`)}
                    className="absolute bottom-4 left-4 rounded-lg bg-[#6288ff] py-1 px-4 italic"
                >
                    {post.game_category}
                </button>
            </div>

            <div className="flex items-start justify-between px-2">
                <div
                    className="w-full space-y-2"
                    onClick={() => router.push(`/post/${post.id}`)}
                >
                    <h1
                        className="text-[20px] font-bold"
                        onClick={() => router.push(`/post/${post.id}`)}
                    >
                        {post.title.substring(0, 25)}
                        {post.title.length > 30 && <span>...</span>}
                    </h1>

                    <div className="flex items-center space-x-4">
                        <p className="flex items-center space-x-4">
                            <UserLikeIcon />
                            <span>{post.liked_by.length}</span>
                        </p>
                        <p className="flex items-center space-x-4">
                            <ViewIcon />
                            <span>{post.views}</span>
                        </p>
                    </div>
                </div>

                <div className="relative">
                    {activeUser?.username == post?.gamer_tag && (
                        <div
                            className="cursor-pointer p-2"
                            onClick={() => setShowOptions(!showOptions)}
                        >
                            <OptionsIcon />
                        </div>
                    )}

                    {showOptions && (
                        <div className="absolute -top-[8.5rem] right-0 z-50 w-[180px] rounded-xl border-2 border-gray-400/60">
                            <div
                                onClick={() => router.push(`/edit/${post.id}`)}
                                className="flex w-full cursor-pointer items-center space-x-4 rounded-t-xl bg-gray-600 px-4 py-2 hover:bg-gray-800 hover:text-lg hover:text-gray-300"
                            >
                                <div className="group">
                                    <EditIcon />
                                </div>
                                <h1>Edit Post</h1>
                            </div>
                            <div
                                className="flex w-full cursor-pointer items-center space-x-4 bg-gray-600 px-4 py-2 hover:bg-gray-800 hover:text-lg hover:text-gray-300"
                                onClick={() => {
                                    navigator.clipboard.writeText(dynamicLink)
                                    setCopied(true)
                                }}
                            >
                                <PostShareIcon />
                                <h1>{!copied ? 'Share Post' : 'Copied!'}</h1>
                            </div>

                            {/* add modal to confirm delete post */}
                            <div
                                onClick={() => {
                                    setShowOptions(false)
                                    openModal(post.id)
                                }}
                                className="flex w-full cursor-pointer items-center space-x-4 rounded-b-lg bg-gray-600 px-4 py-2 text-red-500 hover:bg-gray-800 hover:text-lg hover:text-red-600"
                            >
                                <DeleteIcon />
                                <h1>Delete Post</h1>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UserPostComponent

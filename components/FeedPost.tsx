import ShareIcon from '../icons/ShareIcon'
import ViewIcon from '../icons/ViewIcon'
import { HomePost } from '../utils/typings'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectActiveUser } from '../slices/userSlice'
import OptionsIcon from '../icons/OptionsIcon'
import UserLikeIcon from '../icons/UserLikeIcon'
interface Props {
    feedPost: HomePost
}

const FeedPost = ({ feedPost }: Props) => {
    const router = useRouter()

    const activeUser = useSelector(selectActiveUser)

    const [showOptions, setShowOptions] = useState(false)

    const [hasCopied, setHasCopied] = useState(false)

    const [loaded, setLoaded] = useState(false)

    const videoRef = useRef<any>(null)

    const dynamicLink = `${process.env.NEXT_PUBLIC_RELOAD_FRONTEND_URL}/post/${feedPost?.id}`

    const handlePlayVideo = () => {
        videoRef.current.play()
    }

    const handlePauseVideo = () => {
        videoRef.current.pause()
    }

    return (
        <div
            onMouseOut={handlePauseVideo}
            onMouseOver={handlePlayVideo}
            className="group flex w-full cursor-pointer flex-col items-start space-y-2 rounded-xl border-b border-gray-500/80 p-2 transition transition duration-300 duration-300 hover:scale-[110%] hover:bg-gray-800 md:border-none"
        >
            <div
                className="relative mb-2 h-[180px] w-full max-w-[500px] overflow-hidden rounded-[12px] transition lg:h-[180px] 3xl:h-[210px]"
                onClick={() => router.push(`/post/${feedPost.id}`)}
            >
                <img
                    src={
                        loaded
                            ? feedPost.thumbnail[0] !== '/'
                                ? feedPost.thumbnail
                                : `${process.env.NEXT_PUBLIC_RELOAD_API_URL}${feedPost?.thumbnail}`
                            : '/Assets/loading_bg.png'
                    }
                    className="aspect-auto h-full w-full cursor-pointer rounded-[12px] opacity-100 transition duration-500 duration-300 group-hover:hidden group-hover:scale-105 group-hover:opacity-0"
                    onLoad={() => setLoaded(true)}
                />

                {/* <div className="absolute top-[50%] left-[50%] flex h-[4rem] w-[4rem] translate-x-[-50%] translate-y-[-50%] scale-0 transform-gpu items-center justify-center rounded-full bg-black/60 transition duration-300 group-hover:scale-100">
                    <PlayIcon />
                </div> */}

                <div className="hidden h-full w-full group-hover:block">
                    <video
                        className="h-full w-full"
                        height="100%"
                        width="100%"
                        muted={true}
                        controls={false}
                        src={
                            feedPost.video[0] !== '/'
                                ? feedPost.video
                                : `${process.env.NEXT_PUBLIC_RELOAD_API_URL}${feedPost?.video}`
                        }
                        preload="auto"
                        ref={videoRef}
                    />
                </div>
            </div>

            {/* video details */}
            <div className="flex h-full w-full items-start justify-between">
                {/* video top details */}
                <div className="space-y-1">
                    <div className="flex items-center space-x-6 md:hidden">
                        <div className="flex items-center space-x-4">
                            <p className="flex items-center space-x-4">
                                <UserLikeIcon />
                                <span>{feedPost.liked_by.length}</span>
                            </p>
                            <p className="flex items-center space-x-4">
                                <ViewIcon />
                                <span>{feedPost.views}</span>
                            </p>
                        </div>{' '}
                    </div>
                    <div
                        onClick={() => router.push(`/post/${feedPost.id}`)}
                        className="flex flex-col"
                    >
                        <h1 className="h-[calc(2*1.5rem)] cursor-pointer text-xl font-semibold leading-6 lg:h-[calc(2*1em*1.5rem)] lg:text-[24px]">
                            {feedPost.title}
                        </h1>
                    </div>

                    <div>
                        <button
                            className="relative inline-block cursor-pointer whitespace-nowrap rounded-lg py-2 pr-2 text-lg transition duration-300 hover:text-blue-500 lg:text-[20px]"
                            onClick={() =>
                                router.push(`/profile/${feedPost.gamer_tag}`)
                            }
                        >
                            {feedPost.gamer_tag}
                        </button>
                    </div>

                    <div className="mb-2">
                        <h1
                            className="inline-block cursor-pointer whitespace-nowrap rounded-lg bg-[#6288ff] p-2 italic"
                            onClick={() =>
                                router.push(`/home/${feedPost.game_category}`)
                            }
                        >
                            {feedPost.game_category}
                        </h1>
                    </div>

                    <div className="hidden items-center space-x-5 group-hover:flex">
                        <p className="flex items-center space-x-4">
                            <UserLikeIcon />
                            <span>{feedPost.liked_by.length}</span>
                        </p>
                        <p className="flex items-center space-x-4">
                            <ViewIcon />
                            <span>{feedPost.views}</span>
                        </p>
                    </div>
                </div>

                <div className="relative p-2">
                    <div onClick={() => setShowOptions(!showOptions)}>
                        <OptionsIcon />
                    </div>

                    {showOptions && (
                        <div
                            className="absolute right-2 cursor-pointer rounded-xl border-2 border-gray-400/60 bg-gray-600 px-4 py-2"
                            onClick={() => {
                                navigator.clipboard.writeText(dynamicLink)
                                setHasCopied(true)
                                setTimeout(() => {
                                    setHasCopied(false)
                                    setShowOptions(false)
                                }, 2000)
                            }}
                        >
                            {!hasCopied ? (
                                <div className="flex items-center space-x-2">
                                    <ShareIcon />
                                    <h1>Share</h1>
                                </div>
                            ) : (
                                'Copied!'
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FeedPost

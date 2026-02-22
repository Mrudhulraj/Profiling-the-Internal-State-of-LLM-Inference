import { useState } from 'react'
import { UserPost } from '../utils/typings'
import ViewIcon from '../icons/ViewIcon'
import { useRouter } from 'next/router'
import ShareIcon from '../icons/ShareIcon'

interface Props {
    post: UserPost
}

const MoreVideos = ({ post }: Props) => {
    const router = useRouter()

    const [hasCopied, setHasCopied] = useState(false)

    const [loaded, setLoaded] = useState(false)

    return (
        <div className="group w-[332px] cursor-pointer">
            <div
                className="mx-auto mb-4 h-[154px] w-[332px]  cursor-pointer overflow-hidden rounded-lg transition duration-500 group-hover:shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.3)] group-hover:shadow-[#6300B4] "
                onClick={() => router.push(`/post/${post.id}`)}
            >
                <img
                    src={loaded ? post.thumbnail : '/Assets/loading_bg.png'}
                    className="h-full w-full rounded-xl transition duration-300 group-hover:scale-105"
                    onClick={() => router.push(`/post/${post.id}`)}
                    onLoad={() => setLoaded(true)}
                />
            </div>

            <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                    <h1
                        className="text-[20px] font-bold"
                        onClick={() => router.push(`/post/${post.id}`)}
                    >
                        {post.title.substring(0, 12)}
                        {post.title.length > 12 && <span>...</span>}
                    </h1>
                    <p className="flex items-center space-x-4">
                        <ViewIcon />
                        <span>{post.views}</span>
                    </p>
                </div>

                <div className="relative">
                    <div
                        className="relative cursor-pointer"
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href)
                            setHasCopied(true)
                            setTimeout(() => {
                                setHasCopied(false)
                            }, 2000)
                        }}
                    >
                        {!hasCopied ? <ShareIcon /> : 'Copied!'}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MoreVideos

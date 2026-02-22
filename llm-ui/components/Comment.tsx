import { CommentType } from '../utils/typings'
import { useEffect, useState } from 'react'
import axiosInstance from '../utils/axiosInstance'
import { useRouter } from 'next/router'
interface Props {
    comment: CommentType
}

const CommentComponent = ({ comment }: Props) => {
    const [commentUser, setCommentUser] = useState<any>('')

    const router = useRouter()

    useEffect(() => {
        axiosInstance
            .get(`/api/users/${comment.gamer_tag}/`)
            .then((result) => {
                setCommentUser(result.data)
            })
            .catch((error) => {
                console.log(error)
            })
    }, [])

    return (
        <div className="flex w-full items-start space-x-[55px] border-b border-gray-400 border-opacity-40 pb-4">
            <div
                className="h-12 w-12"
                onClick={() => router.push(`/profile/${comment?.gamer_tag}`)}
            >
                <img
                    src={
                        commentUser?.profile_pic
                            ? commentUser?.profile_pic
                            : '/Assets/defaultAvatar.png'
                    }
                    alt=""
                    className="h-full w-full cursor-pointer rounded-full object-contain"
                />
            </div>

            <div className="flex w-full flex-col items-start space-y-2">
                <h1
                    className="cursor-pointer text-lg text-[#8388ff] hover:underline lg:text-xl"
                    onClick={() =>
                        router.push(`/profile/${comment?.gamer_tag}`)
                    }
                >
                    {comment?.gamer_tag}
                </h1>
                <p className="lg:text-md text-sm">{comment?.content}</p>
            </div>
        </div>
    )
}

export default CommentComponent

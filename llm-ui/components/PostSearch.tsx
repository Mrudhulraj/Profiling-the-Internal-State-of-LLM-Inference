import { PostSearchResult } from '../utils/typings'
import { useRouter } from 'next/router'

interface Props {
    postSearchResult: PostSearchResult
}

const PostSearch = ({ postSearchResult }: Props) => {
    const router = useRouter()

    return (
        <div
            className="flex w-full cursor-pointer items-center space-x-3 rounded-xl py-3 px-2 transition duration-300 hover:bg-[#2f7bcb]"
            onClick={() => router.push(`/post/${postSearchResult.id}`)}
        >
            <div className="h-10 w-[5rem]">
                <img
                    src={postSearchResult.thumbnail}
                    className="h-full w-full rounded-xl"
                />
            </div>

            <h1>
                {postSearchResult.title.substring(0, 12)}
                {postSearchResult.title.length > 12 && <span>...</span>}
            </h1>
        </div>
    )
}

export default PostSearch

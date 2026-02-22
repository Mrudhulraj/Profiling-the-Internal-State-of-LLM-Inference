import { UserSearchResult } from '../utils/typings'
import { useRouter } from 'next/router'

interface Props {
    userSearchResult: UserSearchResult
}

const UserSearch = ({ userSearchResult }: Props) => {
    const router = useRouter()

    return (
        <div
            className="flex w-full cursor-pointer items-center space-x-3 rounded-xl py-3 px-2 transition duration-300 hover:bg-[#2f7bcb]"
            onClick={() => router.push(`/profile/${userSearchResult.username}`)}
        >
            <div className="h-12 w-12">
                <img 
                    src={
                        userSearchResult.profile_pic
                            ? userSearchResult.profile_pic
                            : '/Assets/defaultAvatar.png'
                    }
                    className="h-full w-full object-contain rounded-full"
                />
            </div>

            <h1>{userSearchResult.username}</h1>
        </div>
    )
}

export default UserSearch

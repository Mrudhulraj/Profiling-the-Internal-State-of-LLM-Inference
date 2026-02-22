import { userAutocomplete } from '../utils/typings'

interface Props {
    userAutocomplete: string
}

const UserAutocomplete = ({ userAutocomplete }: Props) => {
    return (
        <div className="flex w-full cursor-pointer rounded-xl py-3 px-2 transition duration-300 hover:bg-[#2f7bcb]">
            {userAutocomplete}
        </div>
    )
}

export default UserAutocomplete

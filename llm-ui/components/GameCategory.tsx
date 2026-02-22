import { Game } from '../utils/typings'

interface Props {
    game: Game
}

const GameCategory = ({ game }: Props) => {
    return (
        <div>
            <img
                onClick={() => game.selectGame()}
                className="h-[4rem] w-[4rem] cursor-pointer"
                src={game.icon}
                alt="gameIcon"
            />
        </div>
    )
}

export default GameCategory

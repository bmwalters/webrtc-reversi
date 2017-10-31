const BLACK = "black"
const WHITE = "white"

const DIRECTIONS = [
	[-1, -1], // NW
	[0,  -1], // N
	[1,  -1], // NE
	[1,   0], // E
	[1,   1], // SE
	[0,   1], // S
	[-1,  1], // SW
	[-1,  0], // W
]

class ReversiGame {
	get localColor() { return this._localColor }
	set localColor(value) {
		this.boardElement.classList.add(`local-${value}`)

		this._localColor = value
	}

	get nextTurn() { return this._nextTurn }
	set nextTurn(value) {
		if (this._nextTurn) {
			this.boardElement.classList.remove(`next-${this._nextTurn}`)
		}

		this.boardElement.classList.add(`next-${value}`)

		this._nextTurn = value
	}

	get invalidState() { return this._invalidState || false }
	set invalidState(value) {
		if (value) {
			console.error("INVALID GAME STATE!")
			this.boardElement.style.backgroundColor = "red"
			this.boardElement.style.transform = "rotate(45deg)"
		}
	}

	constructor(connection, boardElement, localColor) {
		this.connection = connection
		this.boardElement = boardElement
		this.localColor = localColor
		this.remoteColor = (localColor === WHITE) ? BLACK : WHITE
		this.nextTurn = WHITE
		this.cellClicked = this.cellClicked.bind(this)
	}

	setupGameboard() {
		if (this.boardElement.children.length > 0) {
			for (let i = 0; i < 64; i++) {
				let cell = this.boardElement.children[i]

				cell.classList.remove(BLACK)
				cell.classList.remove(WHITE)

				if (i == 27 || i == 36) {
					cell.classList.add(BLACK)
				} else if (i == 28 || i == 35) {
					cell.classList.add(WHITE)
				}
			}
		} else {
			for (let i = 0; i < 64; i++) {
				let cell = document.createElement("div")

				cell.dataset.cellIndex = i
				cell.addEventListener("click", this.cellClicked)

				cell.classList.add("cell")

				if (i == 27 || i == 36) {
					cell.classList.add(BLACK)
				} else if (i == 28 || i == 35) {
					cell.classList.add(WHITE)
				}

				this.boardElement.appendChild(cell)
			}
		}
	}

	distanceToColor(startIndex, color, changeX, changeY) {
		let x = (startIndex % 8) + changeX
		let y = Math.floor(startIndex / 8) + changeY

		let oppositeColor = (color === WHITE) ? BLACK : WHITE

		let i = 0

		while (x >= 0 && y >= 0 && x < 8 && y < 8) {
			let cell = this.boardElement.children[(y * 8) + x]

			if (cell.classList.contains(color)) {
				return i
			} else if (!cell.classList.contains(oppositeColor)) {
				// empty space
				return -1
			}

			x += changeX
			y += changeY
			i++
		}

		return -1
	}

	computeDirectionalDistances(cellIndex, player) {
		let distances = []

		for (let direction of DIRECTIONS) {
			distances.push(this.distanceToColor(cellIndex, player, direction[0], direction[1]))
		}

		return distances
	}

	isValidMove(cellIndex, player, distances) {
		if (cellIndex < 0 || cellIndex > 63) { return false }

		let cell = this.boardElement.children[cellIndex]
		if (cell.classList.contains("white") || cell.classList.contains("black")) { return false }

		// allow caller to pass their own for optimization
		distances = distances || this.computeDirectionalDistances(cellIndex, player)

		return (distances.filter((x) => x > 0).length) > 0
	}

	flipPieces(startIndex, player, distances) {
		// allow caller to pass their own for optimization
		distances = distances || this.computeDirectionalDistances(startIndex, player)

		let oppositeColor = (player === WHITE) ? BLACK : WHITE

		for (let i = 0; i < distances.length; i++) {
			if (distances[i] > 0) {
				let changeX = DIRECTIONS[i][0]
				let changeY = DIRECTIONS[i][1]

				for (let i2 = 0; i2 < distances[i]; i2++) {
					let x = (startIndex % 8) + (changeX * (i2 + 1))
					let y = Math.floor(startIndex / 8) + (changeY * (i2 + 1))
					let cell = this.boardElement.children[(y * 8) + x]

					cell.classList.remove(oppositeColor)
					cell.classList.add(player)
				}
			}
		}
	}

	cellClicked(e) {
		if (this.nextTurn !== this.localColor) { return }

		let cell = e.currentTarget
		let cellIndex = cell.dataset.cellIndex

		let distances = this.computeDirectionalDistances(cellIndex, this.localColor)

		if (!this.isValidMove(cellIndex, this.localColor, distances)) {
			console.log("local player attempted to make an invalid move!")
			return
		}

		this.boardElement.children[cellIndex].classList.add(this.localColor)

		this.flipPieces(cellIndex, this.localColor, distances)

		this.connection.sendMessage({ type: "move", cell: cellIndex })

		this.nextTurn = this.remoteColor
	}

	processRemoteMove(cellIndex) {
		let distances = this.computeDirectionalDistances(cellIndex, this.remoteColor)

		if (!this.isValidMove(cellIndex, this.remoteColor, distances)) {
			this.invalidState = true
			return
		}

		this.boardElement.children[cellIndex].classList.add(this.remoteColor)

		this.flipPieces(cellIndex, this.remoteColor, distances)

		this.nextTurn = this.localColor
	}
}

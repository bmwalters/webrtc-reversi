const Emitter = class {
	constructor() {
		let delegate = document.createDocumentFragment()

		this.addEventListener = (...args) => delegate.addEventListener(...args)
		this.dispatchEvent = (...args) => delegate.dispatchEvent(...args)
		this.removeEventListener = (...args) => delegate.removeEventListener(...args)
	}
}

const peerConnectionConfig = {
	"iceServers": [
		{
			"urls": [
				"stun:stun1.l.google.com:19302",
				"stun:stun2.l.google.com:19302",
				"stun:stun3.l.google.com:19302",
				"stun:stun4.l.google.com:19302"
			]
		}
	]
}

// eslint-disable-next-line no-redeclare, no-unused-vars
const P2PHostConnection = class extends Emitter {
	constructor() {
		super()

		this.pc = new RTCPeerConnection(peerConnectionConfig)

		this.pc.onicecandidate = (e) => {
			if (e.candidate == null) {
				this.dispatchEvent(new CustomEvent("iceCandidate", { detail: this.pc.localDescription }))
			}
		}

		this.pc.onconnection = () => {
			this.dispatchEvent(new CustomEvent("peerConnection"))
		}
	}

	createOffer() {
		this.dc = this.pc.createDataChannel("", { reliable: true })

		this.dc.onopen = () => {
			this.dispatchEvent(new CustomEvent("dcOpen"))
		}

		this.dc.onmessage = (messageEvent) => {
			this.dispatchEvent(new CustomEvent("dcMessage", { detail: JSON.parse(messageEvent.data) }))
		}

		return this.pc.createOffer().then((desc) => {
			this.pc.setLocalDescription(desc, () => {}, () => {})
		})
	}

	setAnswer(answer) {
		return this.pc.setRemoteDescription(answer)
	}

	sendMessage(message) {
		this.dc.send(JSON.stringify({ "message": message }))
	}
}

// eslint-disable-next-line no-redeclare, no-unused-vars
const P2PJoinerConnection = class extends Emitter {
	constructor() {
		super()

		this.pc = new RTCPeerConnection(peerConnectionConfig)

		this.pc.onicecandidate = (e) => {
			if (e.candidate == null) {
				this.dispatchEvent(new CustomEvent("iceCandidate", { detail: this.pc.localDescription }))
			}
		}

		this.pc.onconnection = () => {
			this.dispatchEvent(new CustomEvent("peerConnection"))
		}

		this.pc.ondatachannel = (e) => {
			this.dc = e.channel

			this.dc.onopen = () => {
				this.dispatchEvent(new CustomEvent("dcOpen"))
			}

			this.dc.onmessage = (messageEvent) => {
				this.dispatchEvent(new CustomEvent("dcMessage", { detail: JSON.parse(messageEvent.data) }))
			}
		}
	}

	setOffer(offerDesc) {
		return this.pc.setRemoteDescription(offerDesc)
	}

	createAnswer() {
		return this.pc.createAnswer().then((answerDesc) => {
			this.pc.setLocalDescription(answerDesc)
		})
	}

	sendMessage(message) {
		this.dc.send(JSON.stringify({ "message": message }))
	}
}

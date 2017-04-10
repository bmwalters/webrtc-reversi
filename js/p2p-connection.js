class Emitter {
	constructor() {
		let delegate = document.createDocumentFragment()

		this.addEventListener = (...args) => delegate.addEventListener(...args)
		this.dispatchEvent = (...args) => delegate.dispatchEvent(...args)
		this.removeEventListener = (...args) => delegate.removeEventListener(...args)
	}
}

// eslint-disable-next-line no-redeclare, no-unused-vars
class P2PHostConnection extends Emitter {
	constructor() {
		super()

		this.pc = new RTCPeerConnection(
			{ "iceServers": [{ "urls": ["stun:23.21.150.121"] }] },
			{ "optional": [{ "DtlsSrtpKeyAgreement": true }] }
		)

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
		this.dc = this.pc.createDataChannel("test", { reliable: true })

		this.dc.onopen = () => {
			this.dispatchEvent(new CustomEvent("dcOpen"))
		}

		this.dc.onmessage = (e) => {
			if (e.data.charCodeAt(0) == 2) {
				// The first message we get from Firefox (but not Chrome)
				// is literal ASCII 2 and I do not understand why -- if we
				// leave it in, JSON.parse() will barf.
				return
			}

			this.dispatchEvent(new CustomEvent("dcMessage", { detail: JSON.parse(e.data) }))
		}

		return new Promise((resolve, reject) => {
			this.pc.createOffer((desc) => {
				this.pc.setLocalDescription(desc, () => {}, () => {})
				resolve(desc)
			}, () => {
				reject()
			})
		})
	}

	setAnswer(answer) {
		this.pc.setRemoteDescription(new RTCSessionDescription(answer))
	}

	sendMessage(message) {
		this.dc.send(JSON.stringify({ "message": message }))
	}
}

// eslint-disable-next-line no-redeclare, no-unused-vars
class P2PJoinerConnection extends Emitter {
	constructor() {
		super()

		this.pc = new RTCPeerConnection(
			{ "iceServers": [{ "urls": ["stun:23.21.150.121"] }] },
			{ "optional": [{ "DtlsSrtpKeyAgreement": true }] }
		)

		this.pc.onicecandidate = (e) => {
			if (e.candidate == null) {
				this.dispatchEvent(new CustomEvent("iceCandidate", { detail: this.pc.localDescription }))
			}
		}

		this.pc.onconnection = () => {
			this.dispatchEvent(new CustomEvent("peerConnection"))
		}

		this.pc.ondatachannel = (e) => {
			let datachannel = e.channel || e // Chrome sends event, FF sends raw channel

			this.dc = datachannel

			this.dc.onopen = () => {
				this.dispatchEvent(new CustomEvent("dcOpen"))
			}

			this.dc.onmessage = (messageEvent) => {
				this.dispatchEvent(new CustomEvent("dcMessage", { detail: JSON.parse(messageEvent.data) }))
			}
		}
	}

	setOffer(offerDesc) {
		this.pc.setRemoteDescription(offerDesc)
	}

	createAnswer() {
		return new Promise((resolve, reject) => {
			this.pc.createAnswer((answerDesc) => {
				this.pc.setLocalDescription(answerDesc)
				resolve(answerDesc)
			}, () => {
				reject()
			})
		})
	}

	sendMessage(message) {
		this.dc.send(JSON.stringify({ "message": message }))
	}
}

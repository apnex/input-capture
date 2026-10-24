/**
 * Public surface of input-capture (CONTRACT.md, IC9): openCapture, and nothing else; there is no subpath.
 */
export { openCapture } from "./open-capture.js";
export type {
	BlurFact,
	Capture,
	CaptureBlurEvent,
	CaptureDeclaration,
	CaptureDeclarationWithKeys,
	CaptureDeclarationWithoutKeys,
	CaptureFact,
	CaptureKeyEvent,
	CaptureKeySource,
	CaptureListener,
	CapturePoint,
	CapturePointerEvent,
	CaptureReply,
	CaptureSurface,
	CaptureWheelEvent,
	ContextMenuFact,
	ConvertedPoint,
	DeclarationProblem,
	DeclarationProblemCode,
	KeyFact,
	KeyFactType,
	ListenName,
	OpenCaptureResult,
	PointerFact,
	PointerFactType,
	WheelFact,
} from "./types.js";

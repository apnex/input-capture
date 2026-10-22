/**
 * Public surface of input-capture (CONTRACT.md, IC9): openCapture, and nothing else; there is no subpath.
 */
export { openCapture } from "./open-capture.js";
export type {
	Capture,
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
	ConvertedPoint,
	DeclarationProblem,
	DeclarationProblemCode,
	KeyFact,
	KeyFactType,
	OpenCaptureResult,
	PointerFact,
	PointerFactType,
} from "./types.js";

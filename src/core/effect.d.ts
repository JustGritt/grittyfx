// Types for every effect module, `grittyfx/fx/<category>/<name>`. Import one as a namespace and pass it to createFx:
//   import * as torch from 'grittyfx/fx/fire/torch';
// An effect has `draw` (pure) or `create` (simulated), not both; which one, its meta doesn't say.
import type { Meta, Options, Painter, Sim } from './index.js';

export declare const meta: Meta;
export declare const draw: ((p: Painter, t: number, o: Options) => void) | undefined;
export declare const drawBack: ((p: Painter, t: number, o: Options) => void) | undefined;
export declare const create: ((o: Options) => Sim) | undefined;

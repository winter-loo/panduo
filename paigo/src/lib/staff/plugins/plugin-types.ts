import { VexFlow, type RenderContext } from '$lib/vexflow/vexflow-core';
import type { MovingStaffController, StaffLayout } from '../moving-staff-controller';

export type ConfigInstance = ReturnType<typeof VexFlow.Config.defaults>;

export interface MovingStaffPluginInitArgs<State = unknown, Options = unknown> {
  controller: MovingStaffController;
  layout: StaffLayout;
  config: ConfigInstance;
  context: RenderContext | null;
  state?: State;
  options?: Options;
}

/**
 * Contract implemented by every moving staff plugin instance.
 *
 * The lifecycle matches the moving staff component itself:
 * 1. The factory returns an object that adheres to this interface.
 * 2. The controller wires the plugin in and invokes optional lifecycle hooks when available.
 * 3. The controller eventually calls `destroy` before the plugin instance is discarded.
 *
 * Consumers should keep their plugin logic fully contained inside the hook methods so the
 * controller can orchestrate plugins without knowing about their internal state shape.
 */
export interface MovingStaffPluginInstance<State = unknown> {
  /**
   * Stable identifier for the plugin instance.
   *
   * It is used to look up the plugin later through the controller (`getPlugin`), to allow
   * plugin-specific commands, and to ensure we do not register the same plugin multiple times.
   */
  id: string;
  /**
   * Executed immediately after the plugin has been registered and the staff is ready.
   *
   * Use this hook to perform any drawing or attach event listeners that require a fully
   * initialized controller and layout. It runs once within the current lifecycle.
   */
  onReady?(): void;
  /**
   * Invoked whenever the moving staff recalculates its layout (e.g., window resize, tempo change).
   *
   * Plugins should adapt any cached measurements, redraw overlays, or recompute VexFlow objects
   * based on the new `layout`. The hook will not be called if it is not defined.
   */
  updateLayout?(layout: StaffLayout): void;
  /**
   * Called before the plugin is removed in order to release allocated resources.
   *
   * Clean up DOM listeners, cancel timers, or dispose of VexFlow artifacts here. The controller
   * will not reuse an instance after `destroy` has been invoked.
   */
  destroy?(): void;
  /**
   * Optional serialization of the plugin's internal state.
   *
   * Returning a value here allows the controller to persist plugin-specific data so it can be
   * restored on the next construction. The generic `State` type parameter communicates the shape
   * of that serialized data back to the plugin factory.
   */
  serialize?(): State;
}

export type MovingStaffPluginSpec<Name extends string = string, Options = unknown> =
  | Name
  | {
      name: Name;
      options?: Options;
    };

export type MovingStaffPluginFactory<State = unknown, Options = unknown> = (
  args: MovingStaffPluginInitArgs<State, Options>,
) => MovingStaffPluginInstance<State>;

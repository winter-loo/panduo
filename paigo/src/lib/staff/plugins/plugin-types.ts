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

export interface MovingStaffPluginInstance<State = unknown> {
  id: string;
  onReady?(): void;
  updateLayout?(layout: StaffLayout): void;
  destroy?(): void;
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

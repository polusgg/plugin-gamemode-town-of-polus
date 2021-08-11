import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Vector2 } from "@nodepolus/framework/src/types";
import { Level, SystemType } from "@nodepolus/framework/src/types/enums";
import { Asset, AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { AutoDoorsSystem, DoorsSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems";
import { AutoDoorsHandler } from "@nodepolus/framework/src/host/systemHandlers";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { NumberValue } from "@polusgg/plugin-polusgg-api/src/packets/root/setGameOption";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";

export class LocksmithManager extends BaseManager {
  getId(): string { return "locksmith" }
  getTypeName(): string { return "Locksmith" }
}

const COLOR = "#3d85c6";

const LOCKSMITH_DEAD_STRING = `<color=${COLOR}>Role: Locksmith</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

const DOOR_POSITIONS_BY_ID = {
  [Level.TheSkeld]: [
    [new Vector2(5.1432, 1.3356), 0],
    [new Vector2(-0.708, -4.992), 1],
    [new Vector2(-6.3936, 1.33848), 2],
    [new Vector2(-9.53616, -13.416), 3],
    [new Vector2(1.1316, -11.98128), 4],
    [new Vector2(-0.7092, -8.560801), 5],
    [new Vector2(-5.268, -14.2884), 6],
    [new Vector2(-14.6808, -11.472), 7],
    [new Vector2(-16.9308, -8.9664), 8],
    [new Vector2(-14.676, 1.34064), 9],
    [new Vector2(-16.9308, -2.1276), 10],
    [new Vector2(-14.7348, -5.14176), 11],
    [new Vector2(-9.1452, -0.4439999), 12],
  ],
  [Level.MiraHq]: [
  ],
  [Level.Polus]: [
    [new Vector2(11.255, -9.4473), 0],
    [new Vector2(7.4827, -10.922), 1],
    [new Vector2(5.4228, -13.496), 2],
    [new Vector2(5.492, -18.301), 3],
    [new Vector2(5.9068, -22.348), 4],
    [new Vector2(13.0322, -20.701), 5],
    [new Vector2(10.8987, -19.159), 6],
    [new Vector2(28.757, -17.0636), 7],
    [new Vector2(17.417, -21.7231), 8],
    [new Vector2(26.608, -8.808), 9],
    [new Vector2(24.78, -9.5651), 10],
    [new Vector2(17.293, -10.8416), 11],
  ],
  [Level.Airship]: [
    [new Vector2(-16.1917, -0.91), 0],
    [new Vector2(-8.663198, -0.9099996), 1],
    [new Vector2(-13.3623, -0.01540005), 2],
    [new Vector2(-10.976, -2.331), 3],
    [new Vector2(-0.9260999, 7.100799), 4],
    [new Vector2(-3.6365, 8.784999), 5],
    [new Vector2(2.7146, 8.850798), 6],
    [new Vector2(-8.764699, -7.268799), 7],
    [new Vector2(-8.764699, -11.9763), 8],
    [new Vector2(-1.498, -12.0407), 9],
    [new Vector2(4.249699, 0.042), 10],
    [new Vector2(17.4902, 0.04619999), 11],
    [new Vector2(16.3828, 9.368099), 12],
    [new Vector2(23.97472, 9.368099), 13],
    [new Vector2(19.8583, 5.601399), 14],
    [new Vector2(21.3143, -8.416099), 19],
    [new Vector2(32.5402, -4.694899), 20],
  ],
  [Level.Submerged]: [
    [new Vector2(4.86, 12.172), 0],
    [new Vector2(8.1904, 10.7128), 1],
    [new Vector2(10.3968, 21.952), 2],
    [new Vector2(0.5768, 28.3752), 3],
    [new Vector2(6.0256, 26.564), 4],
    [new Vector2(-6.588799, 17.3112), 5],
    [new Vector2(1.3608, 15.72), 6],
    [new Vector2(-9.4704, 13.0008), 7],
    [new Vector2(-10.8952, 19.3984), 8],
    [new Vector2(-4.629306, -30.9808), 9],
    [new Vector2(-10.47011, -28.7184), 10],
    [new Vector2(5.183494, -37.56356), 11],
    [new Vector2(2.768294, -32.02196), 12],
    [new Vector2(10.4067, -23.12), 13],
    [new Vector2(8.431496, -27.416), 14],
  ],
} as unknown as Record<Level, [Vector2, number][]>;

const LOCKSMITH_RANGE_BY_OPTION = new Map<string, number>([
  ["Short", 0.6],
  ["Normal", 1],
  ["Long", 2.5],
]);

export class Locksmith extends Crewmate {
  protected metadata: RoleMetadata = {
    name: "Locksmith",
    alignment: RoleAlignment.Crewmate,
  };

  private lockpickOpen!: Asset;
  private lockpickClose!: Asset;
  private lockpickNone!: Asset;
  private lockpickButton!: Button;

  private readonly lockSmithRange: number;
  private readonly lockSmithMaxUses: NumberValue;
  private lockSmithLeftUses: number;
  private readonly lockSmithCooldown: NumberValue;
  private doors: [Vector2, number][] = [];

  constructor(owner: PlayerInstance) {
    super(owner);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    this.lockSmithRange = LOCKSMITH_RANGE_BY_OPTION.get(gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithRange)
      .getValue()
      .getSelected())!;
    this.lockSmithMaxUses = gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithUses).getValue();
    this.lockSmithLeftUses = this.lockSmithMaxUses.value;
    this.lockSmithCooldown = gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithCooldown).getValue();

    this.updateDescriptionText();

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${this.owner.getName().toString()}`);

      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.locksmithOnReady.bind(this));
    } else {
      this.locksmithOnReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, LOCKSMITH_DEAD_STRING);
      this.lockpickButton.setSaturated(false);
      this.lockpickButton.setAsset(this.lockpickNone);
    });
  }

  updateButton(position: Vector2 = this.owner.getPosition()): void {
    if (this.lockSmithLeftUses === 0 || this.owner.isDead()) {
      return;
    }

    const canHighlight = this.doors.filter(([pos]) => position.distance(pos) < this.lockSmithRange).length > 0;
    const closestDoor = this.getClosestDoor();
    let nextAsset: Asset = this.lockpickNone;

    if (closestDoor != undefined) {
      const currentState = (this.owner.getLobby().getShipStatus()?.getShipStatus()
        .getSystemFromType(SystemType.Doors) as DoorsSystem | AutoDoorsSystem).getDoorState(closestDoor);

      this.lockpickButton.setSaturated(canHighlight);
      nextAsset = currentState == true ? this.lockpickClose : this.lockpickOpen;
    }

    if (this.lockpickButton.getEntity().getGraphic().getAsset() !== nextAsset.getId()) {
      this.lockpickButton.setAsset(nextAsset);
    }
  }

  async locksmithOnReady(): Promise<void> {
    this.lockpickOpen = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Open.png");
    this.lockpickClose = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Close.png");
    this.lockpickNone = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/None.png");
    this.lockpickButton = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      alignment: EdgeAlignments.RightBottom,
      position: new Vector2(-2.1, -0.7),
      currentTime: 0,
      maxTimer: this.lockSmithCooldown.value,
      isCountingDown: false,
      saturated: false,
      asset: this.lockpickNone,
    });

    this.doors = DOOR_POSITIONS_BY_ID[this.owner.getLobby().getLevel()];

    this.catch("meeting.ended", event => event.getGame())
      .execute(() => {
        this.lockpickButton.setCurrentTime(0);
      });

    this.catch("player.position.updated", p => p.getPlayer()).execute(move => {
      this.updateButton(move.getNewPosition());
    });

    this.catch("room.doors.closed", e => e.getGame()).execute(() => { setTimeout(() => { this.updateButton() }, 100) });

    this.catch("room.doors.opened", e => e.getGame()).execute(() => { setTimeout(() => { this.updateButton() }, 100) });

    this.lockpickButton.on("clicked", _ => {
      if (this.owner.isDead()) {
        return;
      }

      const closestDoorId = this.getClosestDoor();

      if (closestDoorId === undefined || this.lockpickButton.getCurrentTime() !== 0) {
        return;
      }

      this.lockSmithLeftUses -= 1;

      if (this.lockSmithLeftUses === 0) {
        this.lockpickButton.destroy();
      }
      this.updateDescriptionText();
      this.lockpickButton.reset();

      const doorSystem = (this.owner.getLobby().getShipStatus()?.getShipStatus()
        .getSystemFromType(SystemType.Doors) as DoorsSystem | AutoDoorsSystem);

      if (this.owner.getLobby().getLevel() === Level.TheSkeld || this.owner.getLobby().getLevel() === Level.AprilSkeld) {
        const doorHandler = this.owner.getLobby().getHostInstance().getDoorHandler() as AutoDoorsHandler;

        doorHandler.closeDoor(closestDoorId, !doorSystem.getDoorState(closestDoorId));
        // doorHandler.setSystemTimeout(systemId, 30);
      } else {
        this.owner.getLobby().getHostInstance().getDoorHandler()
          ?.setOldShipStatus();

        doorSystem.setDoorState(closestDoorId, !doorSystem.getDoorState(closestDoorId));

        this.owner.getLobby().getHostInstance().getDoorHandler()
          ?.sendDataUpdate();
      }

      this.updateButton();
    });
  }

  getClosestDoor(): number | undefined {
    const inRange = this.doors.filter(([pos]) => this.owner.getPosition().distance(pos) < this.lockSmithRange);
    const closest = inRange.sort((d1, d2) => d1[0].distance(this.owner.getPosition()) - d2[0].distance(this.owner.getPosition()))[0];

    if ((closest as [Vector2, number] | undefined) === undefined || this.lockSmithLeftUses === 0) {
      return undefined;
    }

    return closest[1];
  }

  // onDestroy(_destroyReason: RoleDestroyedReason): void {
  //   super.onDestroy(_destroyReason);
  // }

  getManagerType(): typeof LocksmithManager {
    return LocksmithManager;
  }

  getAssignmentScreen(_player: PlayerInstance, _impostorCount: number): StartGameScreenData {
    return {
      title: "Locksmith",
      subtitle: `You can open or close ${this.lockSmithLeftUses} door${this.lockSmithLeftUses != 1 ? "s" : ""}`,
      color: [61, 133, 198, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Locksmith
Finish your tasks and open/close doors.</color>`;
  }

  updateDescriptionText(): void {
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, `${this.getDescriptionText()}
<color=${COLOR}>You have ${this.lockSmithLeftUses} use${this.lockSmithLeftUses != 1 ? "s" : ""} left.</color>`);
  }
}

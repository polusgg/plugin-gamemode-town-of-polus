import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Vector2 } from "@nodepolus/framework/src/types";
import { Level, SystemType } from "@nodepolus/framework/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { DoorsSystem, AutoDoorsSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems";

export class LocksmithManager extends BaseManager {
  getId(): string { return "locksmith" }
  getTypeName(): string { return "Locksmith" }
}

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
} as any as Record<Level, [Vector2, number][]>;

export class Locksmith extends Crewmate {
  protected metadata: RoleMetadata = {
    name: "Locksmith",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.locksmithOnReady.bind(this));
    } else {
      this.locksmithOnReady();
    }
  }

  async locksmithOnReady(): Promise<void> {
    const lockpickButton = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      alignment: EdgeAlignments.RightBottom,
      position: new Vector2(2.1, 0.7),
      currentTime: 0,
      maxTimer: 1,
      isCountingDown: false,
      saturated: false,
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Predict.png"),
    });

    const myDoors = DOOR_POSITIONS_BY_ID[this.owner.getLobby().getLevel()];

    this.catch("player.position.updated", p => p.getPlayer()).execute(move => {
      // range in this case is 3
      const canHighlight = myDoors.filter(([pos]) => move.getNewPosition().distance(pos) < 3).length > 0;

      lockpickButton.setSaturated(canHighlight);
    });

    lockpickButton.on("clicked", _ => {
      const inRange = myDoors.filter(([pos]) => this.owner.getPosition().distance(pos) < 3);
      const closest = inRange.sort((d1, d2) => d1[0].distance(this.owner.getPosition()) - d2[0].distance(this.owner.getPosition()))[0];

      if ((closest as [Vector2, number] | undefined) === undefined) {
        return;
      }

      const closestDoorId = closest[1];

      this.owner.getLobby().getHostInstance().getDoorHandler()
        ?.setOldShipStatus();

      const currentState = (this.owner.getLobby().getShipStatus()?.getShipStatus()
        .getSystemFromType(SystemType.Doors) as DoorsSystem | AutoDoorsSystem).getDoorState(closestDoorId);

      (this.owner.getLobby().getShipStatus()?.getShipStatus()
        .getSystemFromType(SystemType.Doors) as DoorsSystem | AutoDoorsSystem).setDoorState(closestDoorId, !currentState);

      this.owner.getLobby().getHostInstance().getDoorHandler()
        ?.sendDataUpdate();
    });
  }

  getManagerType(): typeof LocksmithManager {
    return LocksmithManager;
  }

  getAssignmentScreen(_player: PlayerInstance, _impostorCount: number): StartGameScreenData {
    return {
      title: "Locksmith",
      subtitle: "Unlock all the doors",
      color: [61, 133, 198, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=#3d85c6>Role: Locksmith
Finish your tasks.
You can pick locks to open or close doors.</color>`;
  }
}
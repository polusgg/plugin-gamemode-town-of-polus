import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { Vector2 } from "@nodepolus/framework/src/types";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { GameState } from "@nodepolus/framework/src/types/enums";
// import { BaseSystem, HeliSabotageSystem, HqHudSystem, HudOverrideSystem, LaboratorySystem, LifeSuppSystem, ReactorSystem, SwitchSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
// import { InternalSystemType } from "@nodepolus/framework/src/protocol/entities/shipStatus/baseShipStatus/internalSystemType";

export class EngineerManager extends BaseManager {
  getId(): string { return "engineer" }
  getTypeName(): string { return "Engineer" }
}

export class Engineer extends BaseRole {
  public button: Button | undefined;
  protected metadata: RoleMetadata = {
    name: "Engineer",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  sabotageIsOccurring(): boolean {
    return this.owner.getLobby().getHostInstance().getSystemsHandler()
      ?.isSabotaged(true) ?? false;
  }

  * coSaturateButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    while (true) {
      if (player.isDead()) {
        return;
      }

      const isSaturated = button.isSaturated();

      console.log("sabocurring:", this.sabotageIsOccurring(), isSaturated);

      if (this.sabotageIsOccurring() !== isSaturated) {
        button.setSaturated(!isSaturated);
      }
      yield;
    }
  }

  async onReady(): Promise<void> {
    this.button = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Fix.png"),
      maxTimer: 10,
      position: new Vector2(2.1, 0.7),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 0,
      saturated: false,
    });

    this.catch("player.died", event => event.getPlayer()).execute(_ => {
      if (this.button !== undefined) {
        this.button.getEntity().despawn();
        this.button = undefined;
      }
    });

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateButton(this.owner, this.button));

    this.button.on("clicked", () => {
      const host = this.owner.getLobby().getHostInstance();

      if (this.button === undefined || !this.button.isSaturated() || !this.sabotageIsOccurring()) {
        console.log("lmfao rofl lmafao", this.button === undefined, !this.button?.isSaturated(), !this.sabotageIsOccurring());

        return;
      }

      host.getSystemsHandler()!.repairAll(true);
      this.button.getEntity().despawn();
      this.button = undefined;
    });
  }

  getManagerType(): typeof BaseManager {
    return EngineerManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Engineer",
      subtitle: "Maintain the outpost",
      color: [142, 158, 157, 255],
    };
  }
}

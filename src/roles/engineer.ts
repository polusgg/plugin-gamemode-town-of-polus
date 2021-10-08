import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { Vector2 } from "@nodepolus/framework/src/types";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { GameState } from "@nodepolus/framework/src/types/enums";
// import { BaseSystem, HeliSabotageSystem, HqHudSystem, HudOverrideSystem, LaboratorySystem, LifeSuppSystem, ReactorSystem, SwitchSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
// import { InternalSystemType } from "@nodepolus/framework/src/protocol/entities/shipStatus/baseShipStatus/internalSystemType";

export class EngineerManager extends BaseManager {
  getId(): string { return "engineer" }
  getTypeName(): string { return "Engineer" }
}

const COLOR = "#F8BF14";

const ENGINEER_DEAD_STRING = `<color=${COLOR}>Role: Engineer</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

export class Engineer extends Crewmate {
  public button: Button | undefined;
  protected metadata: RoleMetadata = {
    name: "Engineer",
    alignment: RoleAlignment.Crewmate,
    preventBaseEmoji: true,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, ENGINEER_DEAD_STRING);
    });
  }

  sabotageIsOccurring(): boolean {
    return this.owner.getLobby().getHostInstance().getSystemsHandler()
      ?.isSabotaged(true) ?? false;
  }

  * coSaturateButton(player: PlayerInstance): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    while (true) {
      if (player.isDead()) {
        return;
      }

      if (this.button) {
        const isSaturated = this.button.isSaturated();
  
        if (this.sabotageIsOccurring() !== isSaturated) {
          this.button.setSaturated(!isSaturated);
        }
      }

      yield;
    }
  }

  async onReady(): Promise<void> {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    await this.spawnButton();

    this.catch("player.died", event => event.getPlayer()).execute(_ => {
      if (this.button !== undefined) {
        this.button.getEntity().despawn();
        this.button = undefined;
      }
    });

    if (gameOptions.getOption(TownOfPolusGameOptionNames.EngineerUses).getValue().getSelected() === "Per Round") {
      this.catch("meeting.started", event => event.getGame()).execute(_ => {
        if (!this.button) {
          this.spawnButton();
        }
      });
    }

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateButton(this.owner));
  }

  async spawnButton() {
    this.button = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Fix.png"),
      maxTimer: 0.1,
      position: new Vector2(-2.1, -0.7),
      alignment: EdgeAlignments.RightBottom,
      currentTime: 0,
      saturated: false,
    });

    this.button.on("clicked", () => {
      const host = this.owner.getLobby().getHostInstance();

      if (this.button === undefined || !this.button.isSaturated() || !this.sabotageIsOccurring() || this.button.isDestroyed()) {
        return;
      }

      host.getSystemsHandler()!.repairAll(true);
      this.button.getEntity().despawn();
      this.button = undefined;

      Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText(""));
    });
  }

  getManagerType(): typeof BaseManager {
    return EngineerManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Engineer",
      subtitle: "Maintain the outpost",
      color: [248, 191, 21, 255],
    };
  }

  getDescriptionText(extra: string = "\nYou can fix 1 sabotage."): string {
    return `<color=${COLOR}>Role: Engineer
Finish your tasks.${extra}</color>`;
  }
}

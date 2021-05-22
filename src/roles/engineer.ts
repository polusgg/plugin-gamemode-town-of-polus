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
import { BaseSystem, HeliSabotageSystem, HqHudSystem, HudOverrideSystem, LaboratorySystem, LifeSuppSystem, ReactorSystem, SwitchSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems";
import { TownOfPolusGameOptions } from "../..";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { InternalSystemType } from "@nodepolus/framework/src/protocol/entities/shipStatus/baseShipStatus/internalSystemType";
import { TownOfPolusGameOptionNames } from "../types";

export class EngineerManager extends BaseManager {
  getId(): string { return "engineer" }
  getTypeName(): string { return "Engineer" }
}

export class Engineer extends BaseRole {
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
    const systems: (BaseSystem | undefined)[] = this
      .owner
      .getLobby()
      .getSafeShipStatus()
      .getShipStatus()
      .getSystems();

    for (let i: InternalSystemType = 0; i < systems.length; i++) {
      const element = systems[i];

      if (element !== undefined) {
        switch (i) {
          case InternalSystemType.HeliSabotageSystem:
            if ((element as HeliSabotageSystem).getCompletedConsoles().size !== 2) {
              return true;
            }
            break;
          case InternalSystemType.Reactor:
            if ((element as ReactorSystem).getCountdown() !== 10000) {
              return true;
            }
            break;
          case InternalSystemType.Laboratory: {
            const labSystem = element as LaboratorySystem;
            const a = [...labSystem.getUserConsoles().values()];

            if (a.filter((e, p) => a.indexOf(e) === p).length !== 2) {
              return true;
            }
            break;
          }
          case InternalSystemType.Oxygen:
            if ((element as LifeSuppSystem).getCompletedConsoles().size !== 2) {
              return true;
            }
            break;
          case InternalSystemType.Switch:
            if ((element as SwitchSystem).getActualSwitches().equals((element as SwitchSystem).getExpectedSwitches())) {
              return true;
            }
            break;
          case InternalSystemType.HudOverride:
            if ((element as HudOverrideSystem).isSabotaged()) {
              return true;
            }
            break;
          case InternalSystemType.HqHud:
            if ((element as HqHudSystem).getCompletedConsoles().size !== 2) {
              return true;
            }
            break;
          default:
            break;
        }
      }
    }

    return false;
  }

  * coSaturateButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    while (true) {
      const isSaturated = button.getSaturated();

      if (this.sabotageIsOccurring() !== isSaturated) {
        button.setSaturated(!isSaturated);
      }
      yield;
    }
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Fix.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.EngineerCooldown).getValue().value,
      position: new Vector2(2.1, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.setCountingDown(false);
      button.setCurrentTime(0);
      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());

      Services.get(ServiceType.CoroutineManager)
        .beginCoroutine(this.owner, this.coSaturateButton(this.owner, button));

      button.on("clicked", () => {
        const host = this.owner.getLobby().getHostInstance();

        if (!button.getSaturated() || !this.sabotageIsOccurring()) {
          return;
        }

        button.reset();
        host.getSystemsHandler()!.repairAll(true);
      });
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

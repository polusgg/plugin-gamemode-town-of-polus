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
import { Level, SystemType } from "@nodepolus/framework/src/types/enums";
import { BaseSystem, HeliSabotageSystem, HqHudSystem, HudOverrideSystem, LifeSuppSystem, ReactorSystem, SwitchSystem } from "@nodepolus/framework/src/protocol/entities/shipStatus/systems";
import { ElectricalAmount, HeliSabotageAmount, MiraCommunicationsAmount, NormalCommunicationsAmount, OxygenAmount, ReactorAmount } from "@nodepolus/framework/src/protocol/packets/rpc/repairSystem/amounts";
import { HeliSabotageAction, MiraCommunicationsAction, OxygenAction, ReactorAction } from "@nodepolus/framework/src/protocol/packets/rpc/repairSystem/actions";
import { Player } from "@nodepolus/framework/src/player";
import { TownOfPolusGameOptions } from "../..";

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

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Fix.png"),
      maxTimer: gameOptions.getOption("engineerCooldown").getValue().value,
      position: new Vector2(2.1, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());
      button.on("clicked", () => {
        button.reset();

        const innerShipStatus = this.owner.getLobby().getShipStatus()!.getShipStatus();
        const host = this.owner.getLobby().getHostInstance();

        innerShipStatus.getSystems().filter(system => system as BaseSystem | undefined).forEach(system => {
          switch (system.getType()) {
            case SystemType.Laboratory:
            case SystemType.Reactor: {
              if (innerShipStatus.getLevel() === Level.Airship) {
                host.getSystemsHandler()!.repairHeliSystem(this.owner as Player, system as HeliSabotageSystem, new HeliSabotageAmount(0, HeliSabotageAction.EnteredCode));
                host.getSystemsHandler()!.repairHeliSystem(this.owner as Player, system as HeliSabotageSystem, new HeliSabotageAmount(1, HeliSabotageAction.EnteredCode));
              } else {
                host.getSystemsHandler()!.repairReactor(this.owner as Player, system as ReactorSystem, new ReactorAmount(0, ReactorAction.PlacedHand));
                host.getSystemsHandler()!.repairReactor(this.owner as Player, system as ReactorSystem, new ReactorAmount(1, ReactorAction.PlacedHand));
              }

              break;
            }
            case SystemType.Oxygen: {
              host.getSystemsHandler()!.repairOxygen(this.owner as Player, system as LifeSuppSystem, new OxygenAmount(0, OxygenAction.Completed));
              host.getSystemsHandler()!.repairOxygen(this.owner as Player, system as LifeSuppSystem, new OxygenAmount(0, OxygenAction.Completed));

              break;
            }
            case SystemType.Electrical: {
              host.getSystemsHandler()!.repairSwitch(this.owner as Player, system as SwitchSystem, new ElectricalAmount(0));
              host.getSystemsHandler()!.repairSwitch(this.owner as Player, system as SwitchSystem, new ElectricalAmount(1));
              host.getSystemsHandler()!.repairSwitch(this.owner as Player, system as SwitchSystem, new ElectricalAmount(2));
              host.getSystemsHandler()!.repairSwitch(this.owner as Player, system as SwitchSystem, new ElectricalAmount(3));
              host.getSystemsHandler()!.repairSwitch(this.owner as Player, system as SwitchSystem, new ElectricalAmount(4));

              break;
            }
            case SystemType.Communications: {
              if (innerShipStatus.getLevel() == Level.MiraHq) {
                host.getSystemsHandler()!.repairHqHud(this.owner as Player, system as HqHudSystem, new MiraCommunicationsAmount(0, MiraCommunicationsAction.EnteredCode));
                host.getSystemsHandler()!.repairHqHud(this.owner as Player, system as HqHudSystem, new MiraCommunicationsAmount(1, MiraCommunicationsAction.EnteredCode));
              } else {
                host.getSystemsHandler()!.repairHudOverride(this.owner as Player, system as HudOverrideSystem, new NormalCommunicationsAmount(true));
              }
              break;
            }
            default: {
              break;
            }
          }
        });
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

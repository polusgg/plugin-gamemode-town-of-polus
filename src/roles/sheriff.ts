import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Vector2 } from "@nodepolus/framework/src/types";

export class SheriffManager extends BaseManager {
  public bundle!: AssetBundle;

  constructor(lobby: LobbyInstance) {
    super(lobby);

    this.load();
  }

  async load(): Promise<void> {
    this.bundle = await AssetBundle.load("TownOfPolus");

    this.owner.getConnections().forEach(connection => {
      Services.get(ServiceType.Resource).load(connection, this.bundle!);
    });
  }

  getId(): string { return "sheriff" }
  getTypeName(): string { return "Sheriff" }
}

export class Sheriff extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Sheriff",
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    Services.get(ServiceType.Button).spawnButton(owner.getSafeConnection(), {
      asset: this.getManager<SheriffManager>("sheriff").bundle.getSafeAsset("Assets/Mods/OfficialAssets/KillButton.png"),
      maxTimer: owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());
    });

    this.catch("player.murdered", event => event.getKiller()).execute(event => {
      if (!event.getPlayer().isImpostor()) {
        event.getKiller().kill();
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return SheriffManager;
  }

  getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    return {
      title: "Sheriff",
      subtitle: `Shoot the impostor${(player.getLobby().getPlayers().filter(x => x.isImpostor()).length > 1 ? "s" : "")}`,
      color: [196, 150, 69, 255],
    };
  }
}

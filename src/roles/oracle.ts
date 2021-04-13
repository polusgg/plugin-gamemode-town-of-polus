import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Vector2 } from "@nodepolus/framework/src/types";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";

export class OracleManager extends BaseManager {
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

  getId(): string { return "oracle" }
  getTypeName(): string { return "Oracle" }
}

export class Oracle extends BaseRole {
  public enchanted: PlayerInstance | undefined;

  protected metadata: RoleMetadata = {
    name: "Oracle",
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    owner.setTasks(new Set());

    Services.get(ServiceType.Button).spawnButton(owner.getSafeConnection(), {
      asset: this.getManager<OracleManager>("oracle").bundle.getSafeAsset("Assets/Mods/OfficialAssets/KillButton.png"),
      maxTimer: owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      button.on("clicked", () => {
        this.enchanted = button.getTarget(owner.getLobby().getOptions().getKillDistance());

        if (this.enchanted !== undefined) {
          Services.get(ServiceType.Animation).setOutline(this.enchanted, [255, 140, 238, 255]);
        }
      });
    });

    this.catch("meeting.started", event => event.getVictim()).execute(event => {
      if (this.enchanted === undefined) {
        return;
      }

      Services.get(ServiceType.Animation).clearOutline(this.enchanted);

      if (owner.isDead()) {
        const impostorColor = "ff0000ff";
        const crewmateColor = "ffffffff";

        Services.get(ServiceType.Name).setForBatch(event.getGame().getLobby().getConnections()
          .filter(connection => this.enchanted?.getConnection() !== connection), this.enchanted, `[${this.enchanted.getRole() == PlayerRole.Impostor ? `${impostorColor}` : `${crewmateColor}`}]${this.enchanted.getName().toString()}[]`);
      }
    });

    this.catch("meeting.ended", event => event.getExiledPlayer()).execute(event => {
      if (this.enchanted === undefined) {
        return;
      }

      const crewmateColor = "ffffffff";

      Services.get(ServiceType.Name).setForBatch(event.getGame().getLobby().getConnections()
        .filter(connection => this.enchanted?.getConnection() !== connection), this.enchanted, `[${crewmateColor}]${this.enchanted.getName().toString()}[]`);
    });
  }

  getManagerType(): typeof BaseManager {
    return OracleManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Oracle",
      subtitle: "Enchant a player",
      color: [255, 140, 238, 255],
    };
  }
}

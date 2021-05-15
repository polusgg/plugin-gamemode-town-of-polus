import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { GameOverReason } from "@nodepolus/framework/src/types/enums";

export class SheriffManager extends BaseManager {
  getId(): string { return "sheriff" }
  getTypeName(): string { return "Sheriff" }
}

export class Sheriff extends BaseRole {
  protected metadata: RoleMetadata = {
    name: "Sheriff",
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
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/OfficialAssets/KillButton.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.SheriffCooldown).getValue().value,
      position: new Vector2(2.1, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());
      button.on("clicked", () => {
        if (button.getCurrentTime() != 0) {
          return;
        }

        const target = button.getTarget(this.owner.getLobby().getOptions().getKillDistance());

        if (target === undefined) {
          return;
        }

        button.reset();

        this.owner.murder(target);

        if (!target.isImpostor()) {
          this.owner.murder(this.owner);
        }
      });
    });
    this.catch("game.ended", event => event.getGame())
      .where(event => event.getReason() == GameOverReason.ImpostorsByKill &&
        event.getGame().getLobby().getPlayers()
          .filter(x => x.isImpostor() && !x.isDead()).length > 0)
      .execute(event => event.cancel());
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

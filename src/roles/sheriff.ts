import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";

export class SheriffManager extends BaseManager {
  getId(): string { return "sheriff" }
  getTypeName(): string { return "Sheriff" }
}

export class Sheriff extends Impostor {
  protected metadata: RoleMetadata = {
    name: "Sheriff",
    alignment: RoleAlignment.Crewmate,
  };

  constructor(owner: PlayerInstance) {
    super(owner, PlayerRole.Crewmate);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const button = this.getImpostorButton();

    if (button !== undefined) {
      button.setMaxTime(gameOptions.getOption(TownOfPolusGameOptionNames.SheriffCooldown).getValue().value);

      this.setOnClicked(target => {
        this.owner.murder(target);

        if (!target.isImpostor()) {
          this.owner.murder(this.owner);
        }
      });

      this.setTargetPredicate(players => players[0]);
    }
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

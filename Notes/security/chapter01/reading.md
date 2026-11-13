# Chapter 1: What Is Cybersecurity?｜英文・対訳・語句メモ

**出典：** Jason Andress, *Foundations of Cybersecurity, 2nd Edition*, Chapter 1（教材PDF pp.32–55）。

英文を意味のまとまりごとに「 / 」で区切り、1〜2文ごとに日本語訳を置いています。分かりにくい単語や表現は、読み進めるのに必要な程度だけ短く補足します。

- **読み方：** まず英文を左から読み、分からなければすぐ下の訳を見る。解説は必要なときだけ確認する。
- **スラッシュ：** 文法上の切れ目の目安。単語単位ではなく、意味のかたまりを意識した区切りです。
- **図：** 原著の Figure 1-1〜1-5 は、必要に応じて教材PDFで参照してください。

## What Is Cybersecurity?｜サイバーセキュリティとは？

> Today, / many of us work with computers, / play on computers at home, / go to school online, / buy goods from merchants on the internet, / take our laptops to the coffee shop to read email, / use our smartphones to check our bank balances, / and track our exercise with sensors on our wrists.

今日、私たちの多くはコンピューターを使って働き、自宅で遊び、オンラインで授業を受け、ネットで買い物をしている。ノートパソコンをカフェに持ち込んでメールを読んだり、スマートフォンで銀行口座の残高を確認したり、手首のセンサーで運動を記録したりもする。

*語句：merchant＝商店・販売業者。bank balance＝銀行口座の残高。track＝記録・追跡する。*

> In other words, / computers are ubiquitous.

言い換えれば、コンピューターは至るところに存在する。

*語句：ubiquitous＝至るところにある。*

> Although technology allows us to access a host of information / with a single click of the mouse, / it also poses major security risks.

技術のおかげで、マウスを一度クリックするだけで大量の情報にアクセスできる。一方で、それは重大なセキュリティ上のリスクも生み出す。

*語句：a host of＝非常に多くの。pose a risk＝リスクをもたらす。*

> If the information on the systems used by our employers or our banks / becomes exposed to an attacker, / the consequences could be dire indeed.

勤務先や銀行のシステムにある情報が攻撃者にさらされれば、その結果は実に深刻なものになり得る。

*語句：be exposed to＝～にさらされる。consequence＝結果。dire＝深刻な、悲惨な。*

> We could suddenly find our bank account contents / transferred to a bank in another country / in the middle of the night.

真夜中に銀行口座の預金が突然、外国の銀行へ送金されていたと気づくこともあり得る。

*表現：find A transferred＝Aが送金された状態になっていると気づく。*

> Our employer could lose millions of dollars, / face legal prosecution, / and suffer damage to its reputation / because of a system configuration issue / that allowed an attacker to gain access to a database / containing personally identifiable information (PII) or proprietary information.

勤務先も、システムの設定上の問題によって攻撃者に個人識別情報（PII）や企業独自の情報が入ったデータベースへのアクセスを許してしまい、数百万ドルの損害、法的な訴追、評判の低下に直面するかもしれない。

*語句：configuration＝設定。legal prosecution＝法的な訴追。proprietary＝企業などが独自に保有する。reputation＝評判・信用。*

> Such issues appear in the news media / with disturbing regularity.

こうした問題は、不安になるほど頻繁にニュースで報じられている。

*表現：with disturbing regularity＝心配になるほど頻繁に。*

> Thirty years ago, / such breaches were nearly nonexistent, / largely because the technology was at a relatively low level / and few people were using it.

30年前には、こうした情報漏えいなどの侵害はほとんど存在しなかった。技術がまだ比較的未発達で、利用者も少なかったことが主な理由だ。

*語句：breach＝（安全・機密の）侵害。nonexistent＝存在しない。largely because＝主として～だから。*

> Although technology changes at an increasingly rapid rate, / much of the theory about keeping ourselves secure / lags behind.

技術の変化はますます速くなっているが、私たちの安全を守るための理論の多くは、その変化に追いついていない。

*表現：lag behind＝後れを取る、追いつかない。*

> If you can gain a good understanding of the basics of cybersecurity, / you're on a strong footing / to cope with changes as they come.

サイバーセキュリティの基礎をしっかり理解できれば、今後どんな変化が起きても対応するための確かな土台を築ける。

*表現：be on a strong footing＝しっかりした基盤がある。cope with＝対処する。as they come＝起こるたびに。*

> In this chapter, / I'll cover some of the basic concepts of cybersecurity, / including security models, attacks, threats, vulnerabilities, and risks.

この章では、セキュリティモデル、攻撃、脅威、脆弱性、リスクなど、サイバーセキュリティの基本概念を扱う。

> I'll also delve into some slightly more complex concepts / when discussing risk management and defense in depth.

さらに、リスク管理と多層防御を説明する中で、もう少し複雑な考え方にも踏み込む。

*表現：delve into＝詳しく掘り下げる。defense in depth＝多層防御。*

## Defining Cybersecurity｜サイバーセキュリティの定義

> Generally speaking, / security means protecting your assets, / whether from attackers invading your networks, / natural disasters, vandalism, loss, or misuse.

一般にセキュリティとは、ネットワークへの侵入者、自然災害、破壊行為、紛失、不正使用などから、自分の資産を守ることを意味する。

*語句：asset＝資産。vandalism＝故意の破壊行為。misuse＝誤用・不正使用。*

> Ultimately, / you'll attempt to secure yourself against the most likely forms of attack, / to the best extent you reasonably can, / given your environment.

結局のところ、自分の環境を踏まえ、無理なくできる最大限の範囲で、起こりそうな攻撃から身を守ることを目指す。

*表現：to the best extent you reasonably can＝合理的に可能な限り。given ～＝～を考慮すると。*

> You may have a wide range of potential assets / that you want to secure.

守りたい資産には、実にさまざまなものがある。

> These could include physical items with inherent value, / such as gold, / or those that have value to your business, / such as computing hardware.

例えば、金のようにそれ自体に価値のある物や、コンピューター機器のように事業にとって価値のある物理的な資産だ。

*語句：inherent＝本来備わっている。computing hardware＝コンピューター機器。*

> You may also have valuables of a more ethereal nature, / such as software, source code, or data.

ソフトウェア、ソースコード、データなど、形のない資産にも価値がある。

*語句：ethereal＝形のない、実体のつかみにくい。*

> In today's computing environment, / you're likely to find that your logical assets / (assets that exist as data or intellectual property) / are at least as valuable as, / if not more valuable than, / your physical assets (those that are tangible objects or materials).

今日の情報処理環境では、データや知的財産として存在する論理的な資産は、実際に手で触れられる物理的な資産と少なくとも同程度、場合によってはそれ以上に価値があると気づくだろう。

*表現：if not more valuable than＝それ以上とまでは言わなくても（実際にはそれ以上かもしれない）。tangible＝触れることのできる。*

> That's where cybersecurity comes in.

そこで重要になるのが、サイバーセキュリティだ。

*表現：That's where ～ comes in.＝そこで～の出番になる。*

> Cybersecurity aims to protect data, systems, and networks / from unauthorized access, use, disclosure, disruption, modification, or destruction.

サイバーセキュリティは、データ、システム、ネットワークを、不正なアクセス、使用、開示、妨害、改変、破壊から守ることを目的とする。

*語句：disclosure＝開示・漏えい。disruption＝中断・妨害。modification＝変更・改変。*

> In other words, / you want to protect your data and systems / from those who seek to misuse them, / intentionally or unintentionally, / or from those who should not have access to them at all.

つまり、故意かどうかにかかわらずデータやシステムを不適切に使う人や、そもそもアクセスを許されていない人から、それらを守ろうとすることだ。

*語句：intentionally＝意図的に。unintentionally＝意図せずに。at all＝そもそも、まったく。*

## When Are You Secure?｜いつ「安全」と言えるのか？

> The computer science researcher Eugene Spafford once said, / "The only truly secure system is one that is powered off, / cast in a block of concrete / and sealed in a lead-lined room with armed guards— / and even then, I have my doubts."

計算機科学の研究者ユージン・スパフォードはかつて、「本当に安全なシステムとは、電源を切り、コンクリートの塊に埋め込み、武装した警備員のいる鉛張りの部屋に封印したものだけだ。それでも私は疑わしいと思う」と語った。

*語句：cast in＝～の中に固め込む。lead-lined＝鉛で内張りされた。have my doubts＝疑問が残る。*

> A system in such a state might be secure, / but it's not usable or productive. As you increase the level of security, / you usually decrease the level of productivity.

その状態なら安全かもしれないが、利用も生産的な作業もできない。セキュリティを強めると、通常は生産性が下がる。

*語句：usable＝使える。productivity＝生産性。*

> In addition, / when securing an asset, system, or environment, / you must consider how the level of security relates to the value / of the item being secured.

さらに、資産やシステム、環境を守る際には、その価値に見合ったセキュリティ水準かどうかを考えなければならない。

*表現：relate to＝～と関係する。*

> If you're willing to accommodate the decrease in performance, / you can apply very high levels of security / to every asset for which you're responsible.

性能の低下を受け入れるなら、管理するすべての資産に非常に厳重な対策を施すこともできる。

*語句：accommodate＝受け入れる、対応する。be responsible for＝～に責任を持つ。*

> You could build a billion-dollar facility / surrounded by razor-wire fences and patrolled by armed guards and vicious attack dogs, / complete with a hermetically sealed vault, / to protect your mom's chocolate chip cookie recipe, / but that would be overkill.

母親のチョコチップクッキーのレシピを守るために、何十億ドルもの施設を建て、かみそり状の有刺鉄線を張り巡らせ、武装警備員と獰猛な警備犬に巡回させ、完全密閉の金庫まで設けることもできる。だが、そこまでするのはやりすぎだ。

*語句：vicious＝凶暴な。hermetically sealed＝完全に密閉された。overkill＝過剰な対応。*

> The cost of the security you put in place / should never outweigh the value / of what it is protecting.

導入するセキュリティ対策の費用が、守る対象の価値を上回ってはならない。

*語句：put in place＝導入する。outweigh＝（重要さ・価値などで）上回る。*

### THIS LAW IS YOUR LAW ...｜法律や規格にも注意

> The bodies of law that define standards for security / vary quite a bit from one industry to another / and differ wildly from one country to another.

セキュリティ基準を定める法体系は、業界によってかなり異なり、国によっても大きく違う。

*語句：body of law＝一連の法律・法体系。vary＝異なる。wildly＝大幅に。*

> One example is the difference between data privacy laws / in the United States and the European Union.

一例として、米国と欧州連合（EU）では個人情報保護に関する法律が異なる。

> Organizations that operate globally / need to take care that they're not violating any such laws / while conducting business. When in doubt, / consult legal counsel before acting.

世界中で事業を展開する組織は、事業活動中にこうした法律に違反しないよう注意しなければならない。迷ったら行動する前に法律の専門家に相談することだ。

*語句：violate＝違反する。legal counsel＝法律顧問・法律の専門家。*

> Some laws and regulations try to define what secure means, / or at least some of the steps you should take / to be secure enough.

一部の法律や規制は、「安全」とは何か、少なくとも十分に安全にするために何をすべきかを定めようとしている。

> The Payment Card Industry Data Security Standard (PCI DSS) / applies to companies that process credit card payments, / the Health Insurance Portability and Accountability Act of 1996 (HIPAA) / is for organizations that handle health care and patient records, / the Federal Information Security Modernization Act of 2014 (FISMA) / defines security standards for many federal agencies in the United States, / and there are a host of others.

例えば、PCI DSSはクレジットカード決済を扱う企業に適用され、HIPAAは米国の医療情報や患者記録を扱う組織に関係し、FISMAは米国の多くの連邦機関向けのセキュリティ基準を定めている。このほかにも数多くの法令や基準がある。

*語句：apply to＝～に適用される。federal agency＝連邦政府機関。*

> Whether these standards are effective is debatable, / but following the security standards defined for the industry in which you're operating / is advisable, if not mandated.

これらの基準に効果があるかは議論の余地がある。しかし、義務ではなくても、自分の業界で定められたセキュリティ基準には従うのが望ましい。

*語句：debatable＝議論の余地がある。advisable＝推奨される。mandated＝義務付けられた。*

> The consequences for not doing so / vary quite widely from one standard to the next.

従わなかった場合の結果は、基準によって大きく異なる。

> However, / in some environments, / such security measures might not be sufficient.

ただし、環境によっては、そうした対策だけでは不十分な場合もある。

> In any environment where you plan to put heightened levels of security in place, / you also need to consider the cost of replacing your assets / if you happen to lose them, / and make sure you establish reasonable levels of protection for their value.

より厳重なセキュリティを導入するなら、資産を失った場合の再調達費用も考慮し、その価値に見合う合理的な保護水準を設定する必要がある。

*語句：heightened＝強化された。replace＝交換・再調達する。reasonable＝合理的な。*

> Defining the exact point / at which you can be considered secure / presents a bit of a challenge.

どの時点で「安全だ」と言えるのかを正確に定義するのは、少し難しい。

*表現：present a challenge＝難題となる。*

> Are you secure / when your systems are properly patched? Are you secure / because you use strong passwords?

システムに適切に修正プログラムを適用すれば、安全なのだろうか。強いパスワードを使っていれば安全なのだろうか。

> Are you secure / if you are completely disconnected from the internet? From my point of view, / the answer to all these questions is no.

インターネットから完全に切り離せば安全だろうか。著者の考えでは、どの質問への答えも「いいえ」だ。

*表現：from my point of view＝私の見方では。*

> No single activity or action / will make you secure in every situation.

どんな状況でも必ず安全にできる、ただ一つの対策など存在しない。

> That's because / even if your systems are properly patched, / new attacks will always arise / that make you vulnerable.

適切に修正プログラムを適用していても、新しい攻撃が現れ、弱点が生まれるからだ。

*語句：arise＝発生する。vulnerable＝攻撃を受けやすい、弱点がある。*

> When you're using strong passwords, / an attacker will exploit a different avenue instead.

強力なパスワードを使っていれば、攻撃者は別の侵入経路を悪用するだろう。

*語句：exploit＝悪用する。avenue＝（ここでは）手段・経路。*

> When you're disconnected from the internet, / an attacker could still physically access or steal your systems.

インターネットから切断していても、攻撃者が機器に物理的にアクセスしたり、盗んだりする可能性は残る。

> In short, / defining when you're truly secure is difficult. On the other hand, / defining when you're insecure is a much easier task.

要するに、完全に安全な状態を定義するのは難しい。一方、「安全でない状態」を定義するのはずっと簡単だ。

> Here are several examples / that would put you in this state:

安全でない状態を招く例をいくつか挙げよう。

> - Not applying security patches or application updates / to your systems
> - Using weak passwords / such as password or 1234
> - Downloading programs / from the internet
> - Opening email attachments / from unknown senders
> - Using wireless networks / without encryption

- システムにセキュリティ修正やアプリケーション更新を適用しない
- 「password」「1234」のような弱いパスワードを使う
- インターネットからプログラムをダウンロードする
- 不明な送信者からのメール添付ファイルを開く
- 暗号化されていない無線ネットワークを使う

*語句：attachment＝添付ファイル。encryption＝暗号化。※これは原著の例示であり、ネットからのダウンロードが一律に危険という意味ではない。*

> I could go on and on for some time / adding to this list.

この一覧には、まだまだ多くの例を追加できる。

*表現：go on and on＝延々と続ける。*

> The good news is that / once you identify the areas in an environment / that can make it unsafe, / you can take steps to mitigate these issues.

よい点は、環境を危険にする要因を特定できれば、それを軽減する対策を取れることだ。

*語句：identify＝特定する。mitigate＝軽減する。*

> This problem is similar to cutting something in half over and over: / Some small portion will always remain / to be cut in half again.

これは、物を何度も半分に切り続けることに似ている。どこまで切っても、さらに半分にできる小さな部分が残る。

> Although you may never reach a state / that you can definitively call secure, / you can take steps to be reasonably safe.

「間違いなく安全」と言い切れる状態には到達できないかもしれない。それでも、合理的に安全な状態へ近づくことはできる。

*語句：definitively＝決定的に、断言できるほど。reasonably＝合理的な範囲で。*

## Models for Discussing Security Issues｜セキュリティを説明するためのモデル

> When discussing security issues, / it's often helpful to have a model / that you can use as a foundation or a baseline.

セキュリティの問題を話し合うときは、土台や基準として使えるモデルがあると便利だ。

*語句：foundation＝土台。baseline＝比較・判断の基準。*

> This provides a consistent set of terminology and concepts / that we as security professionals can refer to.

モデルがあれば、セキュリティの専門家同士が共通して使える用語と概念が得られる。

*語句：consistent＝一貫した。terminology＝専門用語の体系。refer to＝参照する。*

### The Confidentiality, Integrity, and Availability Triad｜CIAの3要素

> Three of the primary concepts in cybersecurity / are confidentiality, integrity, and availability, / commonly known as the CIA triad, / as shown in Figure 1-1.

サイバーセキュリティの中心となる3つの概念は、機密性、完全性、可用性である。これらをまとめて「CIAの3要素」と呼ぶ（図1-1）。

*語句：confidentiality＝機密性。integrity＝完全性。availability＝可用性。triad＝3つ組。*

> You can use this CIA triad / to think about and discuss security concepts. It's also sometimes written as CAI / or expressed in its negative form / as disclosure, alteration, and denial (DAD).

CIAの3要素は、セキュリティを考え、議論するために使える。CAIという順序で書かれることもあり、反対の状態を表す「開示・改変・拒否（DAD）」という形で示されることもある。

*語句：disclosure＝（望ましくない）情報の開示。alteration＝改変。denial＝利用の拒否・妨害。*

#### Confidentiality｜機密性

> Confidentiality refers to our ability / to protect our data / from those who are not authorized to view it. You could implement confidentiality / at many levels of a process.

機密性とは、閲覧を許可されていない人からデータを守る能力を指す。機密性は、処理のさまざまな段階で確保できる。

*語句：refer to＝～を指す。be authorized to＝～を許可されている。implement＝実現・実装する。*

> As an example, / imagine that a person is withdrawing money from an ATM.

例として、ある人がATMからお金を引き出している場面を考えよう。

> The person in question will likely seek to maintain the confidentiality / of the personal identification number (PIN) / that allows funds to be withdrawn with that ATM card.

本人は、ATMカードでお金を引き出すための暗証番号（PIN）を他人に知られないようにするだろう。

*表現：the person in question＝その当人。maintain＝維持する。withdraw＝引き出す。*

> In addition, / the owner of the ATM will maintain the confidentiality / of the account number, the balance, / and any other information needed to communicate to the bank / releasing the funds.

ATMの運営者も、口座番号や残高、銀行とのやり取りに必要な情報の機密性を守る。

> The bank will also maintain confidentiality / of the transaction with the ATM / and the change of balance in the account / after the funds have been withdrawn.

銀行側も、ATMとの取引内容や、出金後の口座残高の変化に関する情報を秘密に保つ。

*語句：transaction＝取引。funds＝資金・お金。*

> Confidentiality can be compromised in multiple ways.

機密性は、さまざまな形で損なわれる可能性がある。

*表現：be compromised＝（セキュリティなどが）侵害される。*

> You could lose a laptop containing data. Someone could look over your shoulder / while you enter a password.

データの入ったノートパソコンをなくすかもしれない。パスワード入力中に背後からのぞき見されるかもしれない。

*表現：look over your shoulder＝肩越しにのぞき見る。*

> You could send an email attachment to the wrong person, / or an attacker could penetrate your systems, / to name a few scenarios.

メールの添付ファイルを間違った相手に送ってしまうことも、攻撃者にシステムへ侵入されることもある。これらはほんの一例だ。

*語句：penetrate＝侵入する。to name a few＝いくつか例を挙げれば。*

#### Integrity｜完全性

> Integrity is the ability / to prevent people from changing your data / in an unauthorized or undesirable manner.

完全性とは、許可されていない方法や望ましくない方法で、データを変更されるのを防ぐ能力だ。

*語句：undesirable＝望ましくない。manner＝方法・やり方。*

> To maintain integrity, / you need not only the means to prevent unauthorized changes to your data / but also the ability to reverse unwanted authorized changes.

完全性を維持するには、不正な変更を防ぐ仕組みだけでなく、許可された変更であっても望ましくなかった場合は元に戻せることが必要だ。

*表現：not only A but also B＝AだけでなくBも。reverse＝元に戻す。*

> A good example of mechanisms that allow you to control integrity / is in the filesystems of many modern operating systems, / such as Microsoft Windows and Linux.

完全性を管理する仕組みのよい例は、WindowsやLinuxなど、現代の多くのOSのファイルシステムに見られる。

*語句：mechanism＝仕組み。filesystem＝ファイルシステム。*

> To prevent unauthorized changes, / such systems often implement permissions / that restrict the actions / that an unauthorized user can perform on a given file.

不正な変更を防ぐため、こうしたシステムでは、権限のない利用者が特定のファイルに対して行える操作を制限することが多い。

*語句：permission＝権限。restrict＝制限する。given＝特定の。*

> For example, / the owner of a file might have permission to read it and write to it, / while others might have permission only to read it / or no permission to access it at all.

例えば、ファイルの所有者には読み書きを認め、ほかの人には読み取りだけを認めるか、アクセス自体を禁止するといった方法だ。

> Additionally, / some of these systems and many applications, / such as databases, / allow you to undo or roll back any undesirable changes.

さらに、こうしたシステムの一部やデータベースなどの多くのアプリケーションには、望ましくない変更を取り消したり元に戻したりする機能がある。

*表現：undo / roll back＝変更を取り消す・以前の状態に戻す。*

> Integrity is particularly important / when it comes to data / that provides the foundation for other decisions.

完全性は、別の判断の根拠となるデータにおいて特に重要だ。

*表現：when it comes to ～＝～に関して言えば。*

> If an attacker were to alter data / containing the results of medical tests, / a doctor could prescribe the wrong treatment, / which could kill the patient.

例えば、攻撃者が医療検査の結果を書き換えたら、医師が誤った治療を指示し、患者が命を落とす可能性もある。

*語句：alter＝改変する。prescribe＝（治療・薬を）処方・指示する。*

> This has also recently become a significant issue / with the ever-broadening use of artificial intelligence (AI). I'll come back to this discussion / in Chapter 12.

AIの利用がますます広がる中で、この問題は近年いっそう重要になっている。詳しくは第12章で扱う。

*語句：significant＝重要な。ever-broadening＝拡大し続ける。*

#### Availability｜可用性

> The final leg of the CIA triad is availability, / which refers to the ability to access our data / when we need it.

CIAの3要素の最後は可用性であり、必要なときにデータへアクセスできることを指す。

*表現：the final leg＝最後の構成要素。*

> You could lose availability / because of power loss, operating system or application problems, / network attacks, or system compromise, / for example.

例えば、停電、OSやアプリケーションの不具合、ネットワーク攻撃、システムの侵害などによって可用性が失われる。

*語句：power loss＝停電・電源喪失。system compromise＝システムの侵害。*

> When an outside party, / such as an attacker, / causes these problems, / we typically call this a denial-of-service (DoS) attack.

攻撃者のような外部の者がこうした問題を引き起こす場合、一般にサービス拒否（DoS）攻撃と呼ぶ。

*語句：outside party＝外部の人・組織。denial of service＝サービスの利用妨害。*

#### How Does the CIA Triad Relate to Security?｜CIAと実際の問題

> Given the elements of the CIA triad, / we can begin to discuss security issues / with more detail than we otherwise could.

CIAの3要素を使えば、セキュリティの問題をより詳しく説明できる。

*表現：given ～＝～があることを踏まえると。otherwise＝そうでなければ。*

> For example, / let's consider a shipment of backup tapes / on which you've stored the only existing, unencrypted copies / of some sensitive data.

例えば、機密データの唯一の複製を、暗号化せずに保存したバックアップテープの輸送を考えよう。

*語句：shipment＝輸送品。unencrypted＝暗号化されていない。sensitive＝機密性の高い。*

> If you were to lose the shipment in transit, / you would have a security issue. This is likely to include a breach of confidentiality, / as your files were not encrypted.

もし輸送中にそのテープを紛失すれば、セキュリティ上の問題が発生する。ファイルが暗号化されていないので、機密性の侵害も起こり得る。

*表現：in transit＝輸送中に。as ～＝ここでは「～なので」。*

> Lack of encryption could also cause integrity problems.

暗号化されていないことは、完全性の問題にもつながり得る。

> If you recover the tapes in the future, / any alteration of the unencrypted files by an attacker / may not be immediately obvious, / as you would have no good way to discern / the altered from the unaltered data.

後でテープを回収できても、攻撃者が暗号化されていないファイルを改変していた場合、すぐには気づかないかもしれない。変更されたデータと元のデータを見分ける有効な手段がないからだ。

*語句：discern＝見分ける。immediately obvious＝すぐに明らかになる。*

> As for availability, / you'll have an issue unless the tapes are recovered / because you don't have backup copies of the files.

可用性については、テープが回収されない限り問題になる。ほかにファイルの複製がないからだ。

*表現：as for ～＝～については。unless＝～でない限り。*

> Although you can describe this example with relative accuracy / using the CIA triad, / you might find that the model is too restrictive / to describe the entire situation.

CIAの3要素でもこの例を比較的正確に説明できるが、状況全体を表すにはモデルが限定的すぎると感じるかもしれない。

*語句：restrictive＝制約の強い、範囲が狭い。entire＝全体の。*

> A more extensive model, / the Parkerian hexad, / exists for these cases.

そのような場面のために、より広範な「パーカーの6要素モデル」がある。

*語句：extensive＝広範な。hexad＝6つ組。*

### The Parkerian Hexad｜パーカーの6要素モデル

> The Parkerian hexad, / a less well-known model named after Donn Parker / and introduced in his book Fighting Computer Crime (Scribner, 1983), / provides a somewhat more complex variation of the classic CIA triad.

パーカーの6要素モデルは、ドン・パーカーの名を取った、CIAの3要素よりは知名度の低いモデルだ。著書『Fighting Computer Crime』（1983年）で紹介され、従来のCIAモデルを少し複雑に拡張している。

*語句：be named after＝～にちなんで名付けられる。variation＝変形・派生形。*

> In addition to that model's confidentiality, integrity, and availability, / Parker includes possession or control, authenticity, and utility. In total, / the Parkerian hexad has six principles, / as shown in Figure 1-2.

CIAの機密性・完全性・可用性に加え、占有または管理、真正性、有用性を含む。つまり、図1-2のとおり6つの原則からなる。

*語句：possession＝占有。authenticity＝真正性。utility＝有用性。*

> Parker describes integrity slightly differently / than the CIA triad does; / he doesn't account for authorized, but incorrect, modification of data.

パーカーは完全性をCIAモデルとは少し違った形で説明している。許可された変更であっても、その内容が誤っている場合については考慮していない。

*表現：account for＝考慮に入れる。*

> For him, / the data must be whole / and completely unchanged from its previous state.

パーカーの考えでは、データは欠けることなく、以前の状態から一切変更されていないことが求められる。

*語句：whole＝完全な、欠けていない。previous state＝以前の状態。*

#### Possession or Control｜占有または管理

> In the Parkerian hexad, / possession or control refers to the physical disposition / of the media on which the data is stored.

このモデルでいう占有または管理は、データを保存している媒体が物理的にどう扱われ、どこにあるかを指す。

*語句：disposition＝配置・管理状態。media＝記録媒体（mediumの複数形）。*

> This enables you to discuss the physical loss of your data / without involving other factors / such as availability.

この概念を使えば、可用性などのほかの要素と切り離して、データの物理的な喪失を説明できる。

> Returning to the example of your lost shipment of backup tapes, / let's say that some of them were encrypted / and others were not.

先ほどのバックアップテープ紛失の例に戻ろう。暗号化されたテープと、されていないテープが混在していたとする。

> The principle of possession would enable you / to more accurately describe the scope of the incident; / the encrypted tapes in the lot cause a possession problem / but not a confidentiality problem, / while the unencrypted tapes cause a problem on both counts.

占有という原則を使えば、事故の影響範囲をより正確に説明できる。暗号化されたテープでは占有の問題は起きるが機密性の問題は生じず、暗号化されていないテープでは両方の問題が起きる。

*語句：scope＝範囲。lot＝ひとまとまりの品。on both counts＝両方の点で。*

#### Authenticity｜真正性

> The principle of authenticity allows you to say / whether you've attributed the data in question / to the proper owner or creator.

真正性は、そのデータを正しい所有者や作成者のものと判断できているかを表す。

*語句：attribute A to B＝AをBによるものとみなす。in question＝問題になっている、当該の。*

> For example, / if you send an email message / that has been altered so that it appears to be coming from a different address, / you would be violating the authenticity of the email.

例えば、別のアドレスから送信されたように改ざんしたメールを送れば、そのメールの真正性が損なわれる。

*表現：so that it appears to ～＝～のように見えるように。violate＝侵害する。*

> Authenticity can be enforced using digital signatures, / which I'll discuss further in Chapter 6.

真正性は電子署名を用いて確保できる。詳しくは第6章で扱う。

*語句：enforce＝（規則・性質などを）確実に守らせる。digital signature＝電子署名。*

> A similar, but reversed, concept is nonrepudiation, / which prevents people from taking an action such as sending an email / and then later denying that they have done so.

これに似ているが逆方向の考え方が「否認防止」だ。メールの送信などをした人が、後から自分はやっていないと否定することを防ぐ。

*語句：nonrepudiation＝否認防止。deny＝否定する。*

> I'll discuss nonrepudiation at greater length / in Chapter 6 as well.

否認防止についても第6章で詳しく説明する。

*表現：at greater length＝より詳しく。*

#### Utility｜有用性

> Finally, / utility refers to the usefulness of the data to you.

最後に、有用性とは、そのデータが自分にとってどれだけ役立つかを指す。

> Utility is also the only principle of the Parkerian hexad / that is not necessarily binary in nature; / you can have a variety of degrees of utility, / depending on the data and its format.

有用性は、このモデルの中で必ずしも二者択一ではない唯一の原則だ。データの内容や形式によって、役立つ度合いはさまざまに変わる。

*語句：binary＝二択・二値の。in nature＝性質として。degree＝程度。*

> This is a somewhat abstract concept, / but it is useful in discussing certain situations / in the security world.

少し抽象的な概念だが、セキュリティ上の特定の状況を説明するのに役立つ。

*語句：abstract＝抽象的な。*

> For example, / in the shipment of backup tapes, / imagine that some of the tapes were encrypted / and some were not.

例えば、輸送したバックアップテープの一部は暗号化され、一部はされていなかったと考えてみよう。

> For an attacker or other unauthorized person, / the encrypted tapes would likely be of very little utility, / as the data would not be readable.

攻撃者など権限のない人にとって、暗号化されたテープはデータを読めないため、ほとんど役に立たないだろう。

> The unencrypted tapes would be of much greater utility, / as the attacker or unauthorized person / would be able to access the content.

一方、暗号化されていないテープは中身にアクセスできるため、攻撃者にとってはるかに有用になる。

> The concepts discussed in both the CIA triad and the Parkerian hexad / provide a practical basis / to discuss all the ways that something can go wrong / in the world of cybersecurity.

CIAの3要素とパーカーの6要素モデルは、サイバーセキュリティの世界でどんな問題が起こり得るかを議論するための、実用的な土台になる。

*表現：go wrong＝問題が起こる、うまくいかなくなる。*

> These models enable you to better discuss the attacks you might face / and the types of controls you need to put in place / to combat them.

これらのモデルを使えば、想定される攻撃や、それに対抗するために導入すべき対策を、より明確に説明できる。

*語句：control＝（セキュリティ上の）対策・管理策。combat＝対抗する。*

## Attacks｜攻撃

> You may face attacks / from a wide variety of angles and approaches. You can break these down / according to the type of attack, / the risk the attack represents, / and the controls you might use to mitigate it.

攻撃は、さまざまな方向や方法から仕掛けられる。攻撃の種類、そこで生じるリスク、それを軽減する対策などによって分類できる。

*語句：a wide variety of＝多種多様な。break down＝分類・細分化する。represent＝表す。*

### Classification of Attacks｜攻撃の分類

> In general, / attacks can be placed into one of four categories: / interception, interruption, modification, and fabrication.

一般に攻撃は、傍受、中断、改変、偽造の4つの種類に分類できる。

*語句：interception＝傍受。interruption＝中断。modification＝改変。fabrication＝偽造・でっち上げ。*

> Each category can affect one or more of the CIA triad principles, / as shown in Figure 1-3.

どの攻撃も、CIAの3要素のうち1つ以上に影響する可能性がある（図1-3）。

> The line between the categories of attack / and the effects they can have / is somewhat blurred.

攻撃の種類と、それがもたらす影響との境界は、必ずしも明確ではない。

*語句：blurred＝ぼやけた、はっきりしない。*

> Depending on the attack in question, / you might include it in more than one category / or have more than one type of effect.

攻撃によっては複数の種類に分類できたり、複数の影響が同時に生じたりする。

*表現：depending on ～＝～に応じて。in question＝ここで対象としている。*

#### Interception｜傍受

> Interception attacks allow unauthorized users / to access your data, applications, or environments, / and are primarily attacks against confidentiality.

傍受攻撃は、許可されていない利用者にデータ、アプリケーション、環境へのアクセスを可能にするもので、主に機密性を狙う攻撃だ。

*語句：primarily＝主に。unauthorized＝許可されていない。*

> Interception might take the form of / eavesdropping on phone conversations, / unauthorized file viewing or copying, / or reading someone else's email, / and you can conduct it against data at rest or in motion / (these concepts are explained in the "Data at Rest and in Motion" box that follows).

傍受には、電話の盗み聞き、許可のないファイルの閲覧やコピー、他人のメールの読み取りなどがある。保存中のデータにも通信中のデータにも行われる（後の囲み記事で説明する）。

*表現：take the form of ～＝～という形を取る。eavesdropping＝盗み聞き。at rest＝保存中。in motion＝移動・通信中。*

> When properly executed, / interceptions can be difficult to detect.

巧妙に実行された傍受は、発見が難しいことがある。

*語句：execute＝実行する。detect＝検知する。*

#### DATA AT REST AND IN MOTION｜保存中・通信中・使用中のデータ

> You will find, / repeatedly throughout this book, / that I refer to data as either at rest or in motion, / so let's talk about what this means.

本書ではデータを「保存中」または「通信中」と呼び分けることが何度もあるので、その意味を説明しよう。

*語句：repeatedly＝繰り返し。throughout＝～の全体を通じて。*

> Data at rest is stored / and is not in the process of being moved / from one place to another.

「保存中のデータ」とは、保存された状態にあり、ある場所から別の場所へ移動している途中ではないデータだ。

> This data may be on a hard drive or flash drive, / or it may be stored in a database, / for example.

例えば、ハードディスクやUSBメモリ、データベースに保存されているデータが該当する。

> This type of data is generally protected / with some sort of encryption, / often at the level of the file or the entire storage device.

この種類のデータは通常、何らかの暗号化によって守られる。個々のファイル単位や記憶装置全体を暗号化することが多い。

*語句：some sort of＝何らかの。entire＝全体の。storage device＝記憶装置。*

> Data in motion is moving / from one place to another.

「通信中のデータ」は、ある場所から別の場所へ移動しているデータだ。

> When you use your online banking session, / sensitive data flowing between your web browser and your bank / is data in motion.

オンラインバンキングを利用するとき、ブラウザーと銀行の間を流れる機密データがこれに当たる。

*語句：session＝一連の通信・利用状態。flow＝流れる。*

> Data in motion is also protected by encryption, / but in this case / the encryption protects the network protocol or path / used to move the data from one place to another.

通信中のデータも暗号化で守るが、この場合はデータの移動に使う通信手順や経路が暗号化によって保護される。

*語句：protocol＝通信の手順・取り決め。path＝経路。*

> Some may also posit a third category, / data in use. This is data / that an application or individual is actively accessing or modifying.

さらに「使用中のデータ」という3つ目の種類を提唱する人もいる。アプリケーションや人が、現在アクセスしたり変更したりしているデータを指す。

*語句：posit＝（考え・仮説を）提示する。actively＝実際に、現在進行で。*

> Protections on data in use / include permissions and authentication of users. Often the concept of data in use / is conflated with data in motion.

使用中のデータは、アクセス権限や利用者の認証などで保護する。「使用中のデータ」は、「通信中のデータ」と混同されることも多い。

*語句：conflate A with B＝AとBを混同する。*

> Sound arguments can be made on both sides / about whether we should treat this type of data / as its own category.

使用中のデータを独立した種類として扱うべきかどうかは、どちらの立場にも筋の通った主張がある。

*語句：sound＝ここでは「妥当な」。on both sides＝両方の立場に。*

#### Interruption｜中断

> Interruption attacks make your assets unusable or unavailable to you / on a temporary or permanent basis.

中断攻撃は、資産を一時的または恒久的に、使用できない状態にする。

*語句：temporary＝一時的な。permanent＝恒久的な。on a ～ basis＝～という形で。*

> These attacks often affect availability / but can affect integrity as well.

こうした攻撃は可用性に影響することが多いが、完全性にも影響する場合がある。

> You would classify a DoS attack on a mail server / as an availability attack.

メールサーバーへのDoS攻撃は、可用性への攻撃に分類できる。

> On the other hand, / if an attacker manipulates the processes / on which a database runs / to prevent access to the data it contains, / you might consider this an integrity attack / because of the possible loss or corruption of data, / or you might consider it a combination of the two.

一方、攻撃者がデータベースの動作に関わる処理を操作し、データへのアクセスを妨げた場合、データの消失や破損の可能性から完全性への攻撃とも、完全性と可用性の両方への攻撃とも考えられる。

*語句：manipulate＝操作する。corruption＝データの破損。combination＝組み合わせ。*

> You might also consider such a database attack / to be a modification attack / rather than an interruption attack, / as you'll see next.

また、次に見るように、その種のデータベース攻撃は、中断ではなく改変攻撃と考えることもできる。

#### Modification｜改変

> Modification attacks involve tampering with an asset. Such attacks might primarily be considered attacks on integrity / but could also represent attacks on availability.

改変攻撃は、資産に手を加える攻撃だ。主に完全性への攻撃と考えられるが、可用性への攻撃となることもある。

*語句：tamper with＝不正に手を加える。involve＝伴う。*

> If you access a file in an unauthorized manner / and alter the data it contains, / you've affected the integrity of the file's data.

権限なしにファイルへアクセスして内容を書き換えれば、そのデータの完全性が損なわれる。

> However, / if the file in question is a configuration file / that manages how a service behaves— / perhaps one that acts as a web server— / changing the file's contents might affect the availability of that service.

しかし、対象がサービスの動作を決める設定ファイル、例えばWebサーバーの設定ファイルなら、内容の変更がサービスの可用性に影響するかもしれない。

*語句：configuration file＝設定ファイル。behave＝動作する。*

> If the configuration you altered in the file for your web server / changes the way the server deals with encrypted connections, / you could even call this a confidentiality attack.

その変更によってWebサーバーが暗号化された接続を扱う方法まで変わるなら、機密性への攻撃とも呼べるだろう。

*表現：deal with ～＝～を扱う。*

#### Fabrication｜偽造

> Fabrication attacks involve generating data, processes, communications, / or other similar material / with a system.

偽造攻撃は、システムを使ってデータ、処理、通信などを偽って生成する攻撃だ。

*語句：fabrication＝偽造。generate＝生成する。*

> Like the preceding two attack types, / fabrication attacks primarily affect integrity / but could also affect availability.

前述の2種類の攻撃と同様に、偽造攻撃も主に完全性に影響するが、可用性に影響することもある。

*語句：preceding＝前述の。*

> Generating fake information in a database / would be a kind of fabrication attack. You could also generate an email, / a common method of propagating malware.

データベースに偽情報を作るのは偽造攻撃の一種だ。メールを偽造してマルウェアを広める方法も一般的だ。

*語句：fake＝偽の。propagate＝広める、伝播させる。*

> If you have generated enough additional processes, network traffic, email, web traffic, / or nearly anything else that consumes resources, / you might be conducting an availability attack / by rendering the service that handles such traffic / unavailable to legitimate users.

大量の追加処理、ネットワーク通信、メール、Web通信などを作り出して資源を消費させれば、それらを処理するサービスが正規の利用者に使えなくなり、可用性への攻撃になることもある。

*語句：consume resources＝資源を消費する。render A B＝AをBの状態にする。legitimate＝正規の。*

## Threats, Vulnerabilities, and Risks｜脅威・脆弱性・リスク

> To speak more specifically about attacks, / I need to introduce a few new terms. When looking at how an attack might affect you, / you can talk about it in terms of threats, vulnerabilities, and associated risk.

攻撃についてもっと具体的に話すために、いくつか用語を紹介しよう。攻撃がどんな影響を与えるかは、脅威、脆弱性、それに伴うリスクという観点で説明できる。

*表現：in terms of ～＝～の観点から。associated＝関連する、伴う。*

### Threats｜脅威

> Earlier in this chapter, / I mentioned several types of attacks / that could harm your assets / (for example, unauthorized data modification).

この章の前半では、資産に損害を与え得る攻撃の種類をいくつか紹介した。例えば、許可のないデータ改変だ。

> Ultimately, / a threat is something / that has the potential to cause harm.

脅威とは、要するに、損害を引き起こす可能性があるものだ。

*語句：potential＝可能性、潜在的な能力。harm＝損害・危害。*

> Threats tend to be specific to certain environments, / particularly in the world of cybersecurity.

特にサイバーセキュリティの世界では、脅威は環境によって異なる傾向がある。

*表現：tend to ～＝～する傾向がある。be specific to＝～に固有の。*

> For example, / although a virus might be problematic on a Windows operating system, / the same virus will be unlikely to have any effect / on a Linux operating system.

例えば、Windowsで問題を起こすウイルスでも、同じウイルスがLinuxに影響する可能性は低い。

*語句：problematic＝問題を起こす。be unlikely to ～＝～する可能性が低い。*

### Vulnerabilities｜脆弱性

> Vulnerabilities are weaknesses, or holes, / that threats can exploit / to cause you harm.

脆弱性とは、脅威が悪用して損害を引き起こせる弱点や穴のことだ。

*語句：weakness＝弱点。hole＝穴（比喩）。exploit＝悪用する。*

> A vulnerability may involve a specific operating system or application / that you are running, / the physical location of your office building, / a data center that is overpopulated with servers / and producing more heat than its air-conditioning system can handle, / a lack of backup generators, / or other factors.

脆弱性には、使っているOSやアプリケーションの問題だけでなく、オフィスの立地、サーバーを詰め込みすぎて空調能力を超える熱が発生しているデータセンター、非常用発電機の不足なども含まれる。

*語句：overpopulated＝過密な。air-conditioning＝空調。backup generator＝非常用発電機。lack of＝～の不足。*

### VULNERABILITIES AND THE CVE｜脆弱性とCVE

> When discussing a vulnerability, / you will often hear it referred to as a CVE, / which stands for Common Vulnerabilities and Exposures.

脆弱性について話すとき、「CVE」という言葉をよく耳にする。CVEは「Common Vulnerabilities and Exposures」の略だ。

*表現：stand for ～＝～の略である。be referred to as ～＝～と呼ばれる。*

> The CVE concept was introduced / by a couple of very smart folks from MITRE / in 1999 / in the white paper "Towards a Common Enumeration of Vulnerabilities."

CVEという考え方は、MITREの研究者たちが1999年の論文『Towards a Common Enumeration of Vulnerabilities』で紹介した。

*語句：a couple of＝2人の、少数の。white paper＝技術的な論文・報告書。enumeration＝列挙・番号付け。*

> CVEs are formatted as CVE-&lt;year&gt;-&lt;number&gt;, / like CVE-2025-0001.

CVEの識別番号は、CVE-2025-0001のように「CVE-年-番号」という形式を取る。

> If you look at that particular CVE / at https://www.cve.org, / you will see some information about it, / including a description of the vulnerability, its severity, and other details.

このCVE番号を公式サイトで調べると、脆弱性の説明、深刻度、その他の詳細を確認できる。

*語句：particular＝特定の。severity＝深刻度。*

> I'll cover CVEs more specifically / in later chapters.

CVEについては、後の章で詳しく扱う。

### Risks｜リスク

> Risks are the likelihood / that something bad will happen.

リスクは、何か悪いことが起こる可能性を指す。

*語句：likelihood＝起こりやすさ、可能性。*

> For you to have a risk in an environment, / you need to have both a threat and a vulnerability / that the threat could exploit.

ある環境にリスクが存在するには、脅威と、その脅威が悪用できる脆弱性の両方が必要だ。

> For example, / if you have a structure made of wood / and you light a fire nearby, / you have both a threat (the fire) / and a matching vulnerability (the wood structure).

例えば、木造の建物の近くで火をつけたら、火という脅威と、燃えやすい木造建物という脆弱性の両方がある。

*語句：structure＝建造物。matching＝対応する、条件が合う。*

> In this case, / you most definitely have a risk.

この場合、間違いなくリスクが存在する。

*表現：most definitely＝まったく確かに。*

> Likewise, / if you have the same threat of fire / but your structure is made of concrete, / you no longer have a credible risk / because your threat doesn't have a vulnerability to exploit.

一方、同じ火という脅威があっても建物がコンクリート製なら、脅威が悪用できる脆弱性がないため、現実的なリスクはなくなると考えられる。

*語句：likewise＝同様に。credible＝現実に起こり得る、信頼できる。*

> You could argue that / a sufficiently hot flame could damage the concrete, / but this is a much less likely event.

十分に高温の炎ならコンクリートも傷むと言えるかもしれないが、その可能性はずっと低い。

*語句：sufficiently＝十分に。flame＝炎。*

> We often talk about potential but unlikely attacks / in computing environments. The best strategy is to spend your time / mitigating the most likely attacks.

情報処理の環境では、起こる可能性はあっても実際には起こりにくい攻撃についてもよく話す。最善の方針は、特に起こりやすい攻撃への対策に時間を使うことだ。

*語句：strategy＝方針・戦略。unlikely＝起こりにくい。*

> If you sink your resources / into trying to plan for every possible attack, / however unlikely, / you'll spread yourself thin / and lack protection where you need it the most.

どれほど可能性が低い攻撃にも備えようとして資源を注ぎ込むと、対策が薄く広くなり、最も守るべきところの防御が不足してしまう。

*表現：sink resources into ～＝～に資源をつぎ込む。spread yourself thin＝手を広げすぎて力が分散する。*

### Impact｜影響度

> Some organizations, / such as the US National Security Agency (NSA), / add a factor to the threat/vulnerability/risk equation / called impact.

米国国家安全保障局（NSA）のように、脅威・脆弱性・リスクの考え方に「影響度」という要素を追加する組織もある。

*語句：factor＝要因・要素。equation＝ここでは要素の関係式。*

> Impact takes into account the value of the asset being threatened / and uses it to calculate risk.

影響度は脅威にさらされる資産の価値を考慮し、その価値を用いてリスクを計算する。

*表現：take into account＝考慮に入れる。*

> In the backup tape example, / if you consider that the unencrypted tapes contain only your collection of chocolate chip cookie recipes, / you may not actually have a risk / because the exposed data contains nothing sensitive / and you can make additional backups from the source data.

バックアップテープの例で考えると、暗号化されていないテープに入っているのがチョコチップクッキーのレシピ集だけなら、実際にはリスクがないとみなせるかもしれない。機密情報は含まれず、元データから再度バックアップを作れるからだ。

*語句：exposed＝さらされた。additional＝追加の。source data＝元データ。*

> In this case, / you might safely say / that you have no risk.

この場合、リスクはないと言っても差し支えないだろう。

*表現：safely say＝問題なくそう言える。*

## Defense in Depth｜多層防御

> Now that you've learned about the potential effects of a security breach / and the kinds of attacks you might face, / I'll introduce you to a method / of working toward preventing these attacks.

セキュリティ侵害がもたらす影響と、想定される攻撃の種類を学んだところで、こうした攻撃を防ぐための方法を紹介しよう。

*語句：potential effect＝起こり得る影響。work toward ～＝～の実現を目指して取り組む。*

> Defense in depth is a strategy / common to both military maneuvers and cybersecurity.

多層防御は、軍事行動とサイバーセキュリティの両方で使われる戦略だ。

*語句：military maneuver＝軍事行動・作戦。*

> The basic concept is to formulate a multilayered defense / that will allow you to still mount a successful resistance / should one or more of your defensive measures fail.

基本的な考え方は、防御策の一部が破られても抵抗を続けられるよう、複数の層からなる防御を構築することだ。

*語句：formulate＝組み立てる、策定する。mount a resistance＝抵抗する。should ～ fail＝もし～が失敗しても（if ～ fails の倒置）。*

> Figure 1-4 shows an example of layers / you might want to put in place to defend your assets.

図1-4は、資産を守るために設ける防御層の例を示している。

> At the least, / you would want defenses / at the external network, internal network, host, application, and data levels.

少なくとも、外部ネットワーク、内部ネットワーク、ホスト、アプリケーション、データの各段階で防御したい。

*語句：at the least＝少なくとも。host＝サーバーや端末などの機器。*

> Well-implemented defenses at each layer / make it difficult to successfully penetrate your network / and attack your assets directly.

各層で防御を適切に実施すれば、ネットワークへの侵入や資産への直接攻撃が難しくなる。

*語句：well-implemented＝適切に実装された。penetrate＝侵入する。*

> However, / in-depth defense is not a magic bullet.

ただし、多層防御は万能な解決策ではない。

*表現：magic bullet＝何でも解決する特効薬。*

> No matter how many layers you build / or how many defensive measures you place at each layer, / you won't be able to keep out every attacker / for an indefinite period.

何層の防御を設け、各層にどれだけ対策を追加しても、すべての攻撃者を無期限に締め出すことはできない。

*表現：no matter how ～＝どれほど～しても。keep out＝立ち入らせない。indefinite＝期限の定まらない。*

> Nor is this the goal of defense in depth / in a cybersecurity setting.

そもそも、すべての攻撃を永久に防ぐことが、多層防御の目的でもない。

*文法：Nor is this ～＝「これもまた～ではない」。否定語 Nor を前に出した倒置。*

> Rather, / the goal is to place enough defensive measures / between your truly important assets and the attacker / so that you'll notice any attack in progress / and have enough time to prevent it.

むしろ、重要な資産と攻撃者の間に十分な防御策を設け、進行中の攻撃に気づき、食い止める時間を確保することが目的だ。

*表現：rather＝むしろ。so that ～＝～できるように。in progress＝進行中の。*

> An example of such a delaying tactic / is requiring employees to change their passwords every 60 or 90 days.

攻撃者の動きを遅らせる策の一例として、従業員に60日または90日ごとのパスワード変更を義務付ける方法が挙げられている。

*語句：delaying tactic＝時間稼ぎの策。require A to do＝Aに～するよう義務付ける。*

> This practice makes it harder for an attacker / to crack a password in time / to still use it.

この運用によって、攻撃者がパスワードを解読しても、有効なうちに使うのが難しくなるという説明だ。

*表現：in time to ～＝～するのに間に合うように。crack＝（パスワードなどを）解読する。*

> Using stringent password-construction rules / is another delaying tactic.

パスワードの作成規則を厳しくすることも、攻撃を遅らせる方法の一つとされる。

*語句：stringent＝厳格な。construction＝作成・構成。*

> Consider the password mypassword, / which is 10 characters long / and uses only one character set.

例えば「mypassword」というパスワードを考えよう。長さは10文字で、使っている文字種は1種類だけだ。

*語句：character set＝文字種（ここでは小文字・大文字などの区分）。*

> Using a relatively slow off-the-shelf system, / an attacker might take a week or two / to crack this password.

比較的性能の低い市販のシステムを使う攻撃者なら、このパスワードの解読に1～2週間かかるかもしれない。

*表現：off-the-shelf＝既製品の、市販の。*

> With a purpose-built password-cracking system or a botnet, / an attacker might take only an hour or two.

専用のパスワード解読システムやボットネットなら、1～2時間で済むかもしれない。

*語句：purpose-built＝特定の用途向けに作られた。botnet＝不正操作される機器を集めたネットワーク。*

**読書メモ：** ここでの「定期的なパスワード変更」や「解読に要する時間」は原著の説明です。現在の運用方針としてそのまま採用する前提では読まず、必要になったときに現行の基準と区別して確認します。

### BOTNETS｜ボットネット

> Botnets are networks of systems / that have been recruited without the authorization of their owners / and then connected to command-and-control networks / that allow the systems to be remotely operated en masse; / this recruitment and connection typically occurs via malware.

ボットネットとは、所有者の許可なく取り込まれた機器が、遠隔から一斉に操作できる指令用ネットワークにつながったものだ。機器の取り込みや接続は通常、マルウェアを通じて行われる。

*語句：recruit＝取り込む、仲間に加える。command-and-control＝指令・制御（C2）。en masse＝一斉に、大量に。via＝～を通じて。*

> Botnets can consist of millions of machines / and are used to conduct distributed denial-of-service (DDoS) attacks, / crack encryption, / or perform almost any task / that can benefit from the application of distributed computing.

ボットネットは数百万台の機器からなる場合もあり、分散型サービス拒否（DDoS）攻撃、暗号の解読、分散処理が役立つさまざまな作業に使われる。

*語句：consist of＝～から構成される。distributed computing＝分散処理。*

> Botnets are generally under the direct control of their operators, / or others that they are rented out to.

通常、ボットネットは運用者、または運用者から利用権を借りた人の直接的な管理下にある。

*表現：be rented out to＝～に貸し出される。*

> They're also certainly capable of carrying out tasks / without such interaction, / presuming they have been assigned a task to carry out.

もっとも、あらかじめ作業を割り当てられていれば、その都度指示を受けなくても動作できる。

*語句：carry out＝実行する。presuming ～＝～と仮定すれば。assign＝割り当てる。*

> Malware that recruits new nodes into botnets / will typically continue to spread and grow the network in size, / even if no commands are given to the machines.

ボットネットに新しい機器を取り込むマルウェアは、命令が与えられなくても拡散を続け、ネットワークの規模を拡大することが多い。

*語句：node＝ネットワークを構成する機器。spread＝広がる、拡散する。*

### パスワードと解読時間（続き）

> If you use more-secure password construction rules / and go with a password along the lines of MyP@ssword1, / which is also 10 characters long but uses four character sets, / cracking the password would take thousands of years on purpose-built hardware / and upward of several years for a large botnet.

さらに強い作成規則を使い、10文字で4種類の文字種を含む「MyP@ssword1」のようなパスワードにすれば、専用機器での解読に数千年、大規模なボットネットでも数年以上かかるという例が示されている。

*表現：along the lines of ～＝～のような。upward of＝～以上。*

> If you require employees to both change their passwords frequently / and create complex passwords, / an attacker won't be able to crack one in time to use it.

従業員に頻繁なパスワード変更と複雑なパスワードの作成を求めれば、攻撃者が有効期間内に解読して利用することはできないだろう、と説明している。

*語句：frequently＝頻繁に。complex＝複雑な。*

### ENTROPY IN PASSWORDS｜パスワードのエントロピー

> A classic strong password construction scheme / like MyP@ssword1 / consists of eight or more characters / and comprises multiple character sets / (uppercase letters, lowercase letters, numbers, and punctuation).

「MyP@ssword1」のような従来型の強いパスワードの作り方は、8文字以上で、大文字、小文字、数字、記号など複数の文字種を組み合わせるものだ。

*語句：scheme＝方式。comprise＝～で構成される。punctuation＝句読点・記号類。*

> Some would argue that the password contains insufficient entropy (unpredictability) / to be truly secure / and that you'd be better served / with a longer, more entropic, and more easily remembered password.

しかし、このようなパスワードでも十分なエントロピー（予測しにくさ）がなく、本当に安全とは言えないと考える人もいる。むしろ、もっと長く予測されにくく、覚えやすいパスワードのほうがよいという考え方だ。

*語句：insufficient＝不十分な。entropy＝不規則さ・予測しにくさを表す尺度。be better served with ～＝～のほうが適している。*

> Ultimately, / your primary concern should be in constructing reasonably secure passwords / and changing them at regular intervals.

著者は、最終的には、合理的に安全なパスワードを作り、一定の間隔で変更することを主に考えるべきだと述べている。

*語句：primary concern＝第一に考えること。at regular intervals＝一定の間隔で。*

### 多層防御の層

> The layers you include in your defense-in-depth strategy / will vary given the situation and environment you're defending.

多層防御で設ける層は、守る対象の状況や環境によって変わる。

*語句：vary＝変化する、異なる。*

> As discussed, / from a strictly logical (nonphysical) cybersecurity perspective, / you'd want to look at the external network, network perimeter, internal network, host, application, and data layers / as areas to place your defenses.

これまで述べたように、物理面を除いた論理的なセキュリティの観点では、外部ネットワーク、ネットワーク境界、内部ネットワーク、ホスト、アプリケーション、データの各層に対策を置くことになる。

*語句：perspective＝観点。perimeter＝境界・周辺部。strictly＝厳密に。*

> You could add complexity to your defensive model / by including other vital layers, / such as physical defenses, policies, or user awareness and training, / but I'll stick with a simpler example for the time being.

物理的な防御、方針、利用者の意識や教育など、ほかにも重要な層を加えればモデルは複雑になる。ここでは当面、単純な例にとどめる。

*語句：vital＝重要な。for the time being＝当面は。stick with＝～のままにする。*

> Table 1-1 lists some of the defenses / you might use for each of the layers discussed.

表1-1は、各層で利用できる防御策の例を示している。

> Some of these terms, / such as demilitarized zone (DMZ), virtual private network (VPN), intrusion detection systems (IDS), and intrusion prevention systems (IPS) / may be unfamiliar, / but I'll discuss them in detail in Chapter 9.

非武装地帯（DMZ）、仮想私設網（VPN）、侵入検知システム（IDS）、侵入防止システム（IPS）など、聞き慣れない用語もあるかもしれないが、これらは第9章で詳しく説明すると著者は述べている。

*語句：unfamiliar＝なじみのない。in detail＝詳しく。*

> In some cases, / a defensive measure appears in multiple layers / because it applies to more than one area.

ある対策が複数の層に登場する場合もある。それが複数の領域に適用できるからだ。

> A good example is penetration testing, / a method of finding gaps in your security / by using some of the same strategies an attacker would use to break in.

よい例が侵入テストだ。攻撃者が侵入に使うのと同じような手法で、セキュリティ上の隙を発見する。

*語句：penetration testing＝侵入テスト。gap＝隙・不足。break in＝侵入する。*

> I'll discuss this in greater depth in Chapter 15, / as you might want to use penetration testing / on every layer of your defense.

侵入テストは防御のあらゆる層で使うことが考えられるため、第15章でさらに詳しく説明する。

*表現：in greater depth＝より深く、詳しく。*

> You can also see / where specific controls may be tied to particular layers, / such as firewalls and proxies at the network perimeter.

また、ネットワーク境界に置くファイアウォールやプロキシなど、特定の層に結びつく対策もある。

*語句：be tied to＝～と結びついている。specific＝特定の。proxy＝通信を中継する仕組み。*

> As with everything else in the security field, / you could argue that some or all of these controls / could exist at layers other than what is shown here, / but this is a good general guideline.

ほかのセキュリティの話と同様、これらの対策を表とは別の層に置くことも考えられる。ただし、全体の指針としてはこの表が役立つ。

*語句：guideline＝指針・目安。*

> As you move through the book, / I'll discuss each of these areas shown in Table 1-1 / in greater detail, / as well as the specific defenses you might want to use for each.

本書を読み進める中で、表1-1の各領域と、そこに導入できる具体的な防御策をさらに詳しく説明していく。

### Table 1-1: Defense by Layer｜表1-1：層ごとの防御策

原著の表を、英文名と日本語名が分かる形で整理しています。

| Layer（層） | Defensive measures（防御策） |
|---|---|
| External network（外部ネットワーク） | DMZ、VPN、Logging（ログ記録）、Auditing（監査）、Penetration testing（侵入テスト）、Vulnerability analysis（脆弱性分析） |
| Network perimeter（ネットワーク境界） | Firewalls（ファイアウォール）、Proxy（プロキシ）、Logging（ログ記録）、Stateful packet inspection（通信状態を考慮したパケット検査）、Auditing（監査）、Penetration testing（侵入テスト）、Vulnerability analysis（脆弱性分析） |
| Internal network（内部ネットワーク） | IDS（侵入検知システム）、IPS（侵入防止システム）、Logging（ログ記録）、Auditing（監査）、Penetration testing（侵入テスト）、Vulnerability analysis（脆弱性分析） |
| Host（ホスト） | Authentication（認証）、Antivirus（ウイルス対策）、Firewalls、IDS、IPS、Passwords（パスワード）、Hashing（ハッシュ化）、Logging、Auditing、Penetration testing、Vulnerability analysis |
| Application（アプリケーション） | Content filtering（内容の選別）、Data validation（入力・データの検証）、Auditing、Penetration testing、Vulnerability analysis |
| Data（データ） | Encryption（暗号化）、Access controls（アクセス制御）、Backups（バックアップ）、Penetration testing、Vulnerability analysis |

*語句：stateful＝通信の状態を追跡する。validation＝妥当性の検証。hashing＝データから固定長の値を計算する処理。*

## Summary｜まとめ

> This chapter introduced two potential models for thinking about cybersecurity: / the CIA triad, composed of confidentiality, integrity, and availability; / and the Parkerian hexad, composed of confidentiality, integrity, availability, possession or control, authenticity, and utility.

この章では、サイバーセキュリティを考えるための2つのモデルを紹介した。機密性・完全性・可用性からなるCIAの3要素と、そこに占有または管理・真正性・有用性を加えたパーカーの6要素モデルだ。

*語句：be composed of＝～から構成される。*

> As you look to prevent attacks, / understanding the general categories of potential damage is also helpful.

攻撃を防ごうとするとき、起こり得る損害の大まかな種類を理解しておくことも役立つ。

*語句：potential damage＝生じ得る損害。*

> Attacks may impact environments / through interception, interruption, modification, or fabrication. Each of these impact particular areas of the CIA triad.

攻撃は、傍受、中断、改変、偽造という形で環境に影響する。それぞれがCIAの3要素の特定の部分に影響を与える。

> When discussing specific threats that you might face, / understanding the concept of risk is important.

直面する可能性のある具体的な脅威について話す際には、リスクという概念の理解が重要だ。

> You face risk from an attack / only when a threat is present / and you have a vulnerability / that the threat can exploit.

攻撃によるリスクが生じるのは、脅威が存在し、さらにその脅威が悪用できる脆弱性がある場合だ。

*表現：be present＝存在する。*

> To mitigate risk, / you use three main types of controls: / physical, logical, and administrative.

リスクを軽減するために、物理的、論理的、管理的という3種類の対策を用いる。

*語句：administrative controls＝規則や手続きなどの管理的対策。*

> I'll discuss these control types / at greater length in Chapter 14.

これらの対策の種類については、第14章でさらに詳しく説明する。

> Finally, / this chapter covered defense in depth, / a particularly important concept in the world of cybersecurity.

最後に、サイバーセキュリティで特に重要な多層防御の概念を扱った。

> To build defensive measures using this concept, / you can put in place multiple layers of defense / to delay an attacker long enough to alert you to the attack / and to allow you to mount a more active defense.

この考え方に基づいて複数の防御層を設けることで、攻撃者の動きを遅らせ、攻撃に気づいて積極的な対処に移るための時間を確保できる。

*表現：long enough to ～＝～できるだけ十分に長く。alert A to B＝AにBを知らせる。*

> The foundational cybersecurity concepts this chapter explored / are used on a regular basis / during standard cybersecurity tasks in many organizations; / you might hear someone talking about breaches of confidentiality, / for example, / or the authenticity of a given email message.

この章で学んだ基本概念は、多くの組織の普段のセキュリティ業務で繰り返し使われる。例えば、機密性の侵害や、特定のメールの真正性について話す場面がある。

*語句：on a regular basis＝日常的に、定期的に。given＝ある特定の。*

> Cybersecurity is a daily concern / for organizations of any size, / particularly those that handle any type of personal information, financial data, health care data, educational data, / or other types of information regulated by the laws / of the country in which the organization operates.

サイバーセキュリティは、規模に関係なく、どんな組織にとっても日常的な課題だ。特に、個人情報、金融・医療・教育に関するデータ、事業を行う国の法律で規制される情報などを扱う組織では重要になる。

*語句：concern＝関心事・課題。regulated＝法律などで規制された。*

> When organizations do not invest in cybersecurity, / the consequences can be severe.

組織がサイバーセキュリティに投資しなければ、深刻な結果を招くことがある。

*語句：invest in＝～に投資する。severe＝深刻な。*

> They might face fines, lawsuits, / or even the inability to continue to conduct business / if they lose control of critical or sensitive data.

重要なデータや機密データを管理できなくなると、罰金や訴訟、さらには事業を続けられなくなる事態に直面するかもしれない。

*語句：fine＝罰金。lawsuit＝訴訟。critical＝極めて重要な。*

> In short, / cybersecurity is a key component / of the modern business world.

要するに、サイバーセキュリティは現代のビジネスに欠かせない要素なのだ。

*語句：component＝構成要素。*

## Review Questions｜原著の復習問題

ここは原著の設問を読みやすく訳したものです。**答えは載せていません。** 章の復習問題（quiz.md）とは別です。

1. > What is the goal / of defense in depth?

   多層防御の目的は何ですか？

2. > What action can be taken / to make you secure in every situation?

   どんな状況でも安全にするには、どんな対策を取ればよいですか？

3. > What is the difference / between authenticity and nonrepudiation?

   真正性と否認防止の違いは何ですか？

4. > Explain the benefits / of security models.

   セキュリティモデルを使う利点を説明してください。

5. > Why is data integrity important?

   データの完全性はなぜ重要ですか？

6. > What concept would you use / to modify a risk / according to the value of the asset in question?

   対象資産の価値を考慮してリスクを評価するには、どの概念を使いますか？

7. > Which parts of the CIA triad / are impacted by fabrication attacks? Why?

   偽造攻撃はCIAの3要素のうち、どれに影響しますか？ それはなぜですか？

8. > What does the Parkerian hexad give you / that the CIA triad does not?

   パーカーの6要素モデルには、CIAの3要素にはない何がありますか？

9. > What is the difference / between security and cybersecurity?

   セキュリティとサイバーセキュリティはどう違いますか？

10. > Why do interception attacks / not impact integrity?

    なぜ傍受攻撃は完全性に影響しないのですか？

## Project #1: Testing Password Entropy｜演習1：パスワードのエントロピーを調べる

**PDFで確認して補完した節：** 添付されたテキストにはありませんでしたが、原著では第1章の復習問題の後にこの演習があります（PDF pp.52–55）。英文の区切り方と訳の形式は本文と同じです。

> The "Entropy in Passwords" box earlier in this chapter / introduced the concept of entropy, or randomness, / which is a measure of a password's strength.

この章の前半にある「パスワードのエントロピー」の囲み記事では、パスワードの強さを表す尺度として、エントロピー（不規則さ）を紹介した。

*語句：randomness＝無作為さ・不規則さ。measure＝尺度。*

> Let's explore various password-generation methods / and how they impact entropy and usability.

ここでは、さまざまなパスワードの作り方が、エントロピーや使いやすさにどう影響するかを調べてみよう。

*語句：usability＝使いやすさ。various＝さまざまな。*

> We'll use CyberChef, / a tool suite that has a huge number of utilities / for manipulating and interacting with data / and that can calculate the entropy of various passwords.

使用するのはCyberChefだ。これはデータの加工や操作に役立つ多くの機能を備え、さまざまなパスワードのエントロピーも計算できるツール集だ。

*語句：suite＝関連する道具の一式。manipulate＝加工・操作する。calculate＝計算する。*

> You can download and run it locally, / but I recommend using the online version / for ease of use.

ダウンロードして手元の環境で実行することもできるが、使いやすさを考えるとオンライン版がおすすめだという。

*表現：for ease of use＝使いやすさのために。locally＝自分の端末上で。*

> Fire up your browser / and visit https://gchq.github.io/CyberChef/. In the upper-left corner, / beneath Operations, / you'll see a search field.

ブラウザーを起動して、CyberChefのサイトにアクセスする。左上の「Operations」の下に検索欄がある。

*表現：fire up＝（機器・アプリを）起動する。beneath＝～の下に。*

> Enter entropy in this box, / and you'll see the Entropy operation show up / at the top of the list.

検索欄に「entropy」と入力すると、「Entropy」という操作が一覧の先頭に表示される。

*表現：show up＝現れる、表示される。*

> Drag the Entropy operation / into the Recipe column. You'll see that the Visualization drop-down / is set to Shannon Scale by default.

「Entropy」の操作を「Recipe」列にドラッグする。「Visualization」の選択欄は、初期状態で「Shannon Scale」に設定されているはずだ。

*語句：drop-down＝選択式のメニュー。by default＝初期設定で。*

> Shannon entropy is a measure of entropy / introduced by Claude Shannon in 1948.

シャノンエントロピーは、クロード・シャノンが1948年に提唱した、エントロピーを表す尺度だ。

> Now you need some passwords to test. Let's try these two:

次に、試すためのパスワードを用意する。まずは次の2つだ。

> Tr0ub4dor&3
>
> correcthorsebatterystaple

（上の2つが試験用の文字列。）

> To these, / I'll add an old standby:

これに、昔からよく使われるおなじみの文字列を加えよう。

*語句：old standby＝昔からの定番。*

> password

（追加する文字列は「password」。）

> And here's a randomly generated "strong" password:

さらに、無作為に生成した「強い」パスワードも用意する。

> Jtx2NAg6GctawDF_diM_

（これも比較用の文字列。）

> In the Input field / on the right side of the interface, / enter the value password.

画面右側の「Input」欄に「password」と入力する。

*語句：field＝入力欄。interface＝操作画面。*

> In the Output field, / you should now see the Shannon entropy at 2.75 / and a graph showing that value / in comparison to English text and encrypted or compressed data.

すると「Output」欄にシャノンエントロピーの値「2.75」と、英語の文章や暗号化・圧縮されたデータと比較したグラフが表示されるはずだ。

*表現：in comparison to ～＝～と比較して。compressed＝圧縮された。*

> The interface should look something like Figure 1-5.

画面は図1-5のようになるはずだ。

> A strong password has higher entropy, / because it is more unpredictable / and harder to guess or brute-force.

強いパスワードは予測しにくく、推測や総当たりで当てるのが難しいため、エントロピーが高い。

*語句：unpredictable＝予測しにくい。brute-force＝総当たりで試す。*

> If you try all the passwords listed previously, / you should see results similar to those in Table 1-2.

先ほどのすべてのパスワードを試すと、表1-2に似た結果が得られるはずだ。

### Table 1-2: Password Entropy｜表1-2：パスワードのエントロピー

| Password | Shannon entropy |
|---|---:|
| password | 2.75 |
| Tr0ub4dor&3 | 3.277613436819116 |
| correcthorsebatterystaple | 3.363856189774725 |
| Jtx2NAg6GctawDF_diM_ | 4.1219280948873624 |

*注：数値は原著に掲載された例です。実測を行った結果ではありません。*

> The input correcthorsebatterystaple / produces a more entropic password than Tr0ub4dor&3 / and is probably easy to remember.

「correcthorsebatterystaple」は「Tr0ub4dor&3」よりもエントロピーが高く、おそらく覚えやすいパスワードでもある。

*語句：produce＝生み出す。entropic＝エントロピーが高い。*

> While Jtx2NAg6GctawDF_diM_ has even greater entropy, / most people would have great difficulty memorizing it.

「Jtx2NAg6GctawDF_diM_」はさらにエントロピーが高いが、ほとんどの人にとって暗記はとても難しいだろう。

*語句：memorize＝暗記する。have difficulty ～ing＝～するのが難しい。*

> The objectively bad entry password / has the lowest entropy of the lot, / confirming that it is a very weak password.

明らかに弱い「password」は、この中でエントロピーが最も低く、非常に弱いパスワードであることが確認できる。

*語句：objectively＝客観的に。of the lot＝この一群の中で。confirm＝確認する。*

> To go even deeper, / use CyberChef to answer the following questions:

さらに理解を深めるため、CyberChefを使って次の問いに答えてみよう。

1. > If you change or add a single character in the password, / what impact does this have on the entropy? Does it matter which character set you use?

   パスワードの1文字を変更・追加すると、エントロピーはどう変わるか。使う文字種によって違いはあるか。

2. > At what level of entropy / does a password start to be highly difficult to remember?

   エントロピーがどれくらい高くなると、パスワードは覚えるのが非常に難しくなるか。

3. > How do different languages factor into / the calculated entropy for passwords and passphrases?

   パスワードやパスフレーズのエントロピーを計算する際、言語の違いはどのように影響するか。

   *表現：factor into＝～の計算や判断に影響する。passphrase＝複数の単語などを組み合わせた長い認証用の文字列。*

---

**読了後：** 章の内容を自分の言葉で説明する復習は、別ファイルの「chapter01/quiz.md」で行います。この対訳には模範解答を含めません。
